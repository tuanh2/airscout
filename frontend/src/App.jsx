import { useMemo, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const fields = [
  { key: "project_name", label: "Project Name", placeholder: "Example: LayerZero", required: true },
  { key: "website_url", label: "Website URL", placeholder: "https://..." },
  { key: "docs_url", label: "Docs URL", placeholder: "https://docs..." },
  { key: "x_url", label: "X (Twitter) URL", placeholder: "https://x.com/..." },
  { key: "quest_url", label: "Quest URL", placeholder: "https://..." },
  { key: "github_url", label: "GitHub URL", placeholder: "https://github.com/..." },
  { key: "funding_url", label: "Funding Announcement URL", placeholder: "https://..." },
  { key: "notes", label: "Research Notes", placeholder: "Any context for AI analysis...", isTextArea: true },
];

const emptyForm = fields.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {});

const contractAddress = import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS;
const selectedNetwork = import.meta.env.VITE_GENLAYER_NETWORK || "studionet";

function toFriendlyError(err) {
  const msg = err?.message || String(err || "");
  if (msg.includes("wallet_getSnaps")) {
    return "Your wallet provider in this browser does not support MetaMask Snaps (wallet_getSnaps). Open this app in Chrome/Brave with MetaMask extension enabled, then connect wallet again.";
  }
  return msg || "Something went wrong. Please try again.";
}

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
  const [info, setInfo] = useState("");
  const [current, setCurrent] = useState(null);
  const [audits, setAudits] = useState([]);
  const [latestAuditId, setLatestAuditId] = useState(null);
  const hasEthereum = typeof window !== "undefined" && Boolean(window.ethereum);
  const isMetaMask = hasEthereum && Boolean(window.ethereum.isMetaMask);

  const canSubmit = Boolean(walletAddress && form.project_name.trim() && !loading);

  const getClient = (account) =>
    createClient({
      chain: studionet,
      account,
    });

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  };

  const connectWallet = async () => {
    if (!hasEthereum || !isMetaMask) {
      setError("This app currently supports MetaMask Extension for GenLayer transactions.");
      return;
    }

    setError("");
    setInfo("");
    setWalletLoading(true);
    try {
      const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!address) throw new Error("No wallet account returned by MetaMask.");
      const client = getClient(address);
      await client.connect(selectedNetwork);
      setWalletAddress(address);
      setInfo("Wallet connected. You can run an on-chain audit now.");
    } catch (err) {
      setError(toFriendlyError(err));
    } finally {
      setWalletLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!contractAddress) {
      setError("Missing VITE_GENLAYER_CONTRACT_ADDRESS environment variable.");
      return;
    }

    if (!walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }

    const projectName = form.project_name.trim();
    if (!projectName) {
      setError("Please enter a project name.");
      return;
    }

    setLoading(true);
    try {
      const client = getClient(walletAddress);
      await client.connect(selectedNetwork);

      setInfo("Submitting transaction to GenLayer...");
      const txHash = await client.writeContract({
        address: contractAddress,
        functionName: "create_audit",
        args: [
          projectName,
          form.website_url.trim(),
          form.docs_url.trim(),
          form.x_url.trim(),
          form.quest_url.trim(),
          form.github_url.trim(),
          form.funding_url.trim(),
          form.notes.trim(),
        ],
        value: BigInt(0),
      });

      setInfo("Transaction sent. Waiting for on-chain confirmation...");
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
      if (newAuditId < 0) throw new Error("Unexpected audit ID from contract state.");

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
      setInfo(`Audit completed on-chain. Audit ID: ${newAuditId}`);
    } catch (err) {
      setError(toFriendlyError(err));
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
      <a className="genlayer-link" href="https://genlayer.com" target="_blank" rel="noreferrer">
        Powered by GenLayer
      </a>
      <section className="hero">
        <div className="hero-glow" />
        <h1>AirScout</h1>
        <p className="subtitle">On-chain AI due diligence for airdrop hunters.</p>
        <p className="muted">Contract: {contractAddress || "not configured"}</p>
        <p className="muted">Network: {selectedNetwork}</p>
        <div className="actions">
          <button className="primary" type="button" onClick={connectWallet} disabled={walletLoading}>
            {walletLoading ? "Connecting..." : walletAddress ? "Wallet Connected" : "Connect Wallet"}
          </button>
          {walletAddress ? <span className="pill">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</span> : null}
        </div>
        {!isMetaMask ? <p className="warn-text">Wallet status: MetaMask extension not detected. Please open with MetaMask on Chrome/Brave.</p> : null}
        {latestAuditId !== null ? <p className="muted">Latest on-chain audit ID: {latestAuditId}</p> : null}
      </section>

      <div className="grid">
        <section className="card">
          <h3>Run New Audit</h3>
          <form onSubmit={onSubmit}>
            {fields.map((field) => (
              <div key={field.key}>
                <label htmlFor={field.key}>{field.label}{field.required ? " *" : ""}</label>
                {field.isTextArea ? (
                  <textarea
                    id={field.key}
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  />
                ) : (
                  <input
                    id={field.key}
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    required={Boolean(field.required)}
                  />
                )}
              </div>
            ))}
            <button className="primary" type="submit" disabled={!canSubmit || !isMetaMask}>
              {loading ? "Running On-Chain Audit..." : "Run AirScout Audit"}
            </button>
          </form>
          {info ? <p className="ok-text">{info}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </section>

        <section className="card">
          <h3>Result Dashboard</h3>
          {!current && !loading && <p className="muted">No audit yet. Submit a project to see scoring and reasoning.</p>}
          {loading && <p className="muted">Analyzing public evidence on-chain. This can take a while.</p>}
          {current && (
            <>
              <div className="kpis">
                <div className="kpi"><small>Overall Score</small><strong>{current.overall_airdrop_score}</strong></div>
                <div className="kpi"><small>Time Worthiness</small><strong>{current.time_worthiness}</strong></div>
                <div className="kpi"><small>Risk Level</small><strong>{current.risk_level}</strong></div>
              </div>
              <p className="badge-row">{riskBadge(current.risk_level)}{riskBadge(current.sybil_competition_risk)}{riskBadge(current.rule_change_risk)}</p>
              {rows.map(([k, v]) => <p key={k}><span className="muted">{k}:</span> {v}</p>)}
              <p><span className="muted">Recommended Strategy:</span> {current.recommended_strategy}</p>
              <p><span className="muted">Positive Signals:</span> {current.positive_signals}</p>
              <p><span className="muted">Red Flags:</span> {current.red_flags}</p>
              <p><span className="muted">Evidence Summary:</span> {current.evidence_summary}</p>
            </>
          )}
        </section>
      </div>

      <section className="card audits">
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
