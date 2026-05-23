import { useMemo, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const emptyForm = {
  project_name: "",
  website_url: "",
  docs_url: "",
  x_url: "",
  quest_url: "",
  github_url: "",
  funding_url: "",
  notes: "",
};

const contractAddress = import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS;
const selectedNetwork = import.meta.env.VITE_GENLAYER_NETWORK || "studionet";

function riskBadge(v) {
  const value = (v || "unknown").toLowerCase();
  return <span className={`badge ${value}`}>{value}</span>;
}

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(null);
  const [audits, setAudits] = useState([]);
  const [latestAuditId, setLatestAuditId] = useState(null);

  const getClient = (account) =>
    createClient({
      chain: studionet,
      account,
    });

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask is required. Please install MetaMask first.");
      return;
    }

    setError("");
    setWalletLoading(true);
    try {
      const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!address) throw new Error("No wallet account returned by MetaMask.");
      const client = getClient(address);
      await client.connect(selectedNetwork);
      setWalletAddress(address);
    } catch (err) {
      setError(err?.message || "Failed to connect wallet.");
    } finally {
      setWalletLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!contractAddress) {
      setError("Missing VITE_GENLAYER_CONTRACT_ADDRESS in .env.");
      return;
    }

    if (!walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }

    if (!form.project_name.trim()) {
      setError("Project name is required.");
      return;
    }

    setLoading(true);
    try {
      const client = getClient(walletAddress);
      await client.connect(selectedNetwork);

      const txHash = await client.writeContract({
        address: contractAddress,
        functionName: "create_audit",
        args: [
          form.project_name,
          form.website_url,
          form.docs_url,
          form.x_url,
          form.quest_url,
          form.github_url,
          form.funding_url,
          form.notes,
        ],
        value: BigInt(0),
      });

      await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.ACCEPTED,
      });

      const totalAudits = await client.readContract({
        address: contractAddress,
        functionName: "get_total_audits",
        args: [],
      });

      const newAuditId = Number(totalAudits) - 1;
      if (newAuditId < 0) {
        throw new Error("Unexpected audit ID from contract state.");
      }

      const rawAudit = await client.readContract({
        address: contractAddress,
        functionName: "get_audit",
        args: [newAuditId],
      });

      const parsedAudit = JSON.parse(rawAudit);
      const result = {
        ...parsedAudit,
        created_at: new Date().toISOString(),
        audit_id: newAuditId,
      };

      setCurrent(result);
      setLatestAuditId(newAuditId);
      setAudits((prev) => [{ id: prev.length, ...result }, ...prev]);
      setForm(emptyForm);
    } catch (err) {
      setError(err?.message || "Audit failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(
    () =>
      current
        ? [
            ["Token Signal", current.token_signal_score],
            ["Reward Clarity", current.reward_clarity_score],
            ["Project Quality", current.project_quality_score],
            ["Community Authenticity", current.community_authenticity_score],
            ["Backer Legitimacy", current.backer_legitimacy_score],
            ["Product Delivery", current.product_delivery_score],
          ]
        : [],
    [current]
  );

  return (
    <div className="container">
      <section className="hero">
        <h1>AirScout - On-chain AI research for airdrop hunters</h1>
        <p>AirScout turns airdrop hunting from guesswork into evidence-based research.</p>
        <p className="muted">
          Contract: {contractAddress || "not configured"} | Network: {selectedNetwork}
        </p>
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={connectWallet} disabled={walletLoading}>
            {walletLoading ? "Connecting..." : walletAddress ? "Wallet Connected" : "Connect Wallet"}
          </button>
          {walletAddress ? <p className="muted">Wallet: {walletAddress}</p> : null}
          {latestAuditId !== null ? <p className="muted">Latest on-chain audit ID: {latestAuditId}</p> : null}
        </div>
      </section>

      <div className="grid" style={{ marginTop: 16 }}>
        <section className="card">
          <h3>Run AirScout Audit</h3>
          <form onSubmit={onSubmit}>
            {Object.keys(form).map((k) => (
              <div key={k}>
                <label>{k}</label>
                {k === "notes" ? (
                  <textarea value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                ) : (
                  <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                )}
              </div>
            ))}
            <button type="submit" disabled={loading}>
              {loading ? "Running audit..." : "Run AirScout Audit"}
            </button>
            {error ? <p style={{ color: "#ff7b7b" }}>{error}</p> : null}
          </form>
        </section>

        <section className="card">
          <h3>Score Result Dashboard</h3>
          {!current && !loading && <p className="muted">No audit yet. Submit a project to see scoring and reasoning.</p>}
          {loading && <p className="muted">Analyzing public evidence. This can take a while on-chain.</p>}
          {current && (
            <>
              <div className="kpis">
                <div className="kpi">
                  <small>Overall Airdrop Score</small>
                  <strong>{current.overall_airdrop_score}</strong>
                </div>
                <div className="kpi">
                  <small>Time Worthiness</small>
                  <strong>{current.time_worthiness}</strong>
                </div>
                <div className="kpi">
                  <small>Risk Level</small>
                  <strong>{current.risk_level}</strong>
                </div>
              </div>
              <p style={{ marginTop: 12 }}>
                {riskBadge(current.risk_level)}
                {riskBadge(current.sybil_competition_risk)}
                {riskBadge(current.rule_change_risk)}
              </p>
              {rows.map(([k, v]) => (
                <p key={k}>
                  <span className="muted">{k}:</span> {v}
                </p>
              ))}
              <p>
                <span className="muted">Recommended Strategy:</span> {current.recommended_strategy}
              </p>
              <p>
                <span className="muted">Positive Signals:</span> {current.positive_signals}
              </p>
              <p>
                <span className="muted">Red Flags:</span> {current.red_flags}
              </p>
              <p>
                <span className="muted">Evidence Summary:</span> {current.evidence_summary}
              </p>
            </>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h3>Previous Audits ({audits.length})</h3>
        {audits.length === 0 && <p className="muted">No previous audits yet.</p>}
        {audits.map((a) => (
          <div key={a.id} className="list-item">
            <strong>{a.project_name}</strong> | Score {a.overall_airdrop_score} | {riskBadge(a.risk_level)}
            <p className="muted">{new Date(a.created_at).toLocaleString()}</p>
          </div>
        ))}
      </section>
    </div>
  );
}