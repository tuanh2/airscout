import { useMemo, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const mainField = {
  key: "project_name",
  label: "Project Name",
  placeholder: "Example: LayerZero",
  help: "Required. Name used to index this on-chain audit.",
  required: true,
};

const evidenceFields = [
  { key: "website_url", label: "Website URL", placeholder: "https://...", help: "Official project website." },
  { key: "docs_url", label: "Docs URL", placeholder: "https://docs...", help: "Documentation and product details." },
  { key: "x_url", label: "X / Twitter URL", placeholder: "https://x.com/...", help: "Team updates, announcements, and activity." },
  { key: "quest_url", label: "Quest URL", placeholder: "https://...", help: "Campaign or quest page, if available." },
  { key: "github_url", label: "GitHub URL", placeholder: "https://github.com/...", help: "Code and shipping signals." },
  {
    key: "funding_url",
    label: "Funding Announcement URL",
    placeholder: "https://...",
    help: "Backer and financing evidence.",
  },
];

const notesField = {
  key: "notes",
  label: "Notes",
  placeholder: "Any context or hypothesis you want AI to consider...",
  help: "Optional. Add manual research context.",
};

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

function toFriendlyError(err) {
  const msg = err?.message || String(err || "");
  if (msg.includes("wallet_getSnaps")) {
    return "Your wallet provider does not support MetaMask Snaps. Open this app in Chrome or Brave with MetaMask Extension enabled.";
  }
  return msg || "Something went wrong. Please try again.";
}

function getRiskClass(value) {
  const v = (value || "unknown").toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return "unknown";
}

function chip(label, value) {
  return (
    <span className={`chip ${getRiskClass(value)}`}>
      {label}: {String(value || "unknown").toUpperCase()}
    </span>
  );
}

function shortAddress(v) {
  if (!v) return "Not connected";
  return `${v.slice(0, 6)}...${v.slice(-4)}`;
}

function shortContract(v) {
  if (!v) return "Not configured";
  return `${v.slice(0, 8)}...${v.slice(-6)}`;
}

function scorePercent(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function scoreClass(v) {
  const p = scorePercent(v);
  if (p >= 70) return "good";
  if (p >= 45) return "mid";
  return "bad";
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

  const canSubmit = Boolean(walletAddress && form.project_name.trim() && !loading && isMetaMask);

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
      setError("MetaMask Extension is required for GenLayer write transactions.");
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
      setInfo("Wallet connected. Ready to run on-chain audit.");
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

      setInfo("Scanning public evidence...");
      setInfo("Reading project sources...");
      setInfo("Running GenLayer AI analysis...");
      setInfo("Writing audit on-chain...");

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

      setInfo("Transaction sent. Waiting for final confirmation...");
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
      setInfo(`Stored as on-chain audit result. Audit ID: ${newAuditId}`);
    } catch (err) {
      setError(toFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const scoreRows = useMemo(
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
        : [
            ["Token Signal", 0],
            ["Reward Clarity", 0],
            ["Project Quality", 0],
            ["Community Authenticity", 0],
            ["Backer Legitimacy", 0],
            ["Product Delivery", 0],
          ],
    [current]
  );

  const overallScore = current ? scorePercent(current.overall_airdrop_score) : 0;

  return (
    <div className="page">
      <div className="bg-grid" />
      <div className="shell">
        <header className="topbar panel">
          <div>
            <p className="brand">AirScout</p>
            <p className="tagline">On-chain AI due diligence</p>
          </div>
          <div className="top-right">
            <span className="badge-line">Network: {selectedNetwork}</span>
            <span className="badge-line">Contract: {shortContract(contractAddress)}</span>
            <button className="wallet-btn" type="button" onClick={connectWallet} disabled={walletLoading}>
              {walletLoading ? "Connecting..." : walletAddress ? `Wallet ${shortAddress(walletAddress)}` : "Connect Wallet"}
            </button>
          </div>
        </header>

        <section className="hero panel">
          <div className="hero-copy">
            <h1>AirScout</h1>
            <p className="subtitle">On-chain AI research for airdrop hunters</p>
            <p className="desc">
              Check whether a Web3 project is worth farming before wasting time on unclear points, fake hype, weak products, or vague token promises.
            </p>
          </div>
          <div className="hero-stats">
            <div className="mini-stat"><span>AI Web Evidence Scan</span><strong>Multi-source</strong></div>
            <div className="mini-stat"><span>GenLayer On-chain Audit</span><strong>Verifiable</strong></div>
            <div className="mini-stat"><span>Airdrop Worthiness Score</span><strong>0-100</strong></div>
          </div>
          <div className="status-row">
            <span className={`status-pill ${contractAddress ? "ok" : "warn"}`}>Contract {contractAddress ? "connected" : "missing"}</span>
            <span className="status-pill">Network: {selectedNetwork}</span>
            <span className={`status-pill ${walletAddress ? "ok" : "warn"}`}>Wallet: {walletAddress ? "connected" : "not connected"}</span>
          </div>
        </section>

        <main className="dashboard-grid">
          <section className="panel left-col">
            <div className="section-head">
              <h2>Audit Input Console</h2>
              <p>Scan project evidence. Estimate airdrop worthiness. Detect unclear reward signals.</p>
            </div>

            <form onSubmit={onSubmit}>
              <div className="field-wrap">
                <label htmlFor={mainField.key}>{mainField.label} *</label>
                <input
                  id={mainField.key}
                  placeholder={mainField.placeholder}
                  value={form[mainField.key]}
                  onChange={(e) => updateField(mainField.key, e.target.value)}
                  required
                />
                <small>{mainField.help}</small>
              </div>

              <div className="subhead">Evidence Sources (Optional)</div>
              <div className="evidence-grid">
                {evidenceFields.map((field) => (
                  <div key={field.key} className="field-wrap">
                    <label htmlFor={field.key}>{field.label}</label>
                    <input
                      id={field.key}
                      placeholder={field.placeholder}
                      value={form[field.key]}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    />
                    <small>{field.help}</small>
                  </div>
                ))}
              </div>

              <div className="field-wrap">
                <label htmlFor={notesField.key}>{notesField.label}</label>
                <textarea
                  id={notesField.key}
                  placeholder={notesField.placeholder}
                  value={form[notesField.key]}
                  onChange={(e) => updateField(notesField.key, e.target.value)}
                />
                <small>{notesField.help}</small>
              </div>

              <button className="cta" type="submit" disabled={!canSubmit}>
                {loading ? "Running GenLayer Audit..." : "Run AirScout Audit"}
              </button>
            </form>

            <div className="messages">
              {info ? <p className="ok-msg">{info}</p> : null}
              {error ? <p className="err-msg">{error}</p> : null}
              {!isMetaMask ? <p className="warn-msg">MetaMask Extension is required for write transactions.</p> : null}
            </div>
          </section>

          <section className="panel right-col">
            <div className="section-head">
              <h2>Live Research Report</h2>
              <p>Avoid low-ROI farming with evidence-based risk and signal analysis.</p>
            </div>

            <div className="score-hero">
              <div className={`score-ring ${scoreClass(overallScore)}`}>
                <span>{overallScore}</span>
                <small>/100</small>
              </div>
              <div className="score-meta">
                <h3>Overall Airdrop Score</h3>
                <div className="chip-row">
                  {chip("Risk", current?.risk_level || "unknown")}
                  {chip("Time", current?.time_worthiness || "unknown")}
                </div>
                <p className="muted">Stored as on-chain audit result.</p>
              </div>
            </div>

            {!current && !loading ? (
              <div className="empty-state">
                <h4>No audit yet</h4>
                <p>Submit a project to generate an on-chain research report.</p>
                <div className="skeleton-grid">
                  {scoreRows.map(([name]) => (
                    <div key={name} className="skeleton-item">
                      <span>{name}</span>
                      <div className="skeleton-bar" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {loading ? <p className="loading-line">Processing on-chain research flow...</p> : null}

            {current ? (
              <>
                <div className="breakdown-grid">
                  {scoreRows.map(([name, value]) => (
                    <div key={name} className="metric-card">
                      <div className="metric-head">
                        <span>{name}</span>
                        <strong>{scorePercent(value)}</strong>
                      </div>
                      <div className="metric-track">
                        <div className={`metric-fill ${scoreClass(value)}`} style={{ width: `${scorePercent(value)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="insight-panel">
                  <h4>Recommended Strategy</h4>
                  <p>{current.recommended_strategy}</p>
                </div>

                <div className="insight-grid">
                  <div className="insight-panel">
                    <h4>Positive Signals</h4>
                    <p>{current.positive_signals}</p>
                  </div>
                  <div className="insight-panel">
                    <h4>Red Flags</h4>
                    <p>{current.red_flags}</p>
                  </div>
                  <div className="insight-panel full">
                    <h4>Evidence Summary</h4>
                    <p>{current.evidence_summary}</p>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </main>

        <section className="panel history">
          <div className="section-head inline">
            <h2>Research History</h2>
            <span className="count-pill">{audits.length} audits</span>
          </div>

          {audits.length === 0 ? <p className="muted">No previous audits yet.</p> : null}

          <div className="history-grid">
            {audits.map((a) => (
              <article key={a.id} className="history-card">
                <div className="history-top">
                  <h4>{a.project_name}</h4>
                  <span className={`score-pill ${scoreClass(a.overall_airdrop_score)}`}>{scorePercent(a.overall_airdrop_score)}/100</span>
                </div>
                <div className="chip-row compact">
                  {chip("Risk", a.risk_level)}
                  {chip("Time", a.time_worthiness)}
                </div>
                <p className="summary">{a.evidence_summary || "Evidence captured on-chain for this audit."}</p>
                <div className="history-meta">
                  <span>Audit ID: {a.audit_id ?? "n/a"}</span>
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                </div>
              </article>
            ))}
          </div>

          <a className="genlayer-link" href="https://genlayer.com" target="_blank" rel="noreferrer">
            Learn more about GenLayer
          </a>
        </section>
      </div>
    </div>
  );
}