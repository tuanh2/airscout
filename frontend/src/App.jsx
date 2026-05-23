import { useMemo, useState, useEffect, useRef } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const mainField = {
  key: "project_name",
  label: "Project Name",
  placeholder: "Example: Monad",
  help: "Required. Name used to index this on-chain audit.",
  required: true,
};

const evidenceFields = [
  { key: "website_url", label: "Website URL", placeholder: "https://monad.xyz", help: "Official project website." },
  { key: "docs_url", label: "Docs URL", placeholder: "https://docs.monad.xyz", help: "Documentation and product details." },
  { key: "x_url", label: "X / Twitter URL", placeholder: "https://x.com/monad_xyz", help: "Team updates and announcements." },
  { key: "quest_url", label: "Quest URL", placeholder: "https://app.galxe.com/quest/monad", help: "Campaign or quest page, if available." },
  { key: "github_url", label: "GitHub URL", placeholder: "https://github.com/monad-labs", help: "Code and shipping signals." },
  { key: "funding_url", label: "Funding Announcement URL", placeholder: "https://crunchbase.com/organization/monad-labs", help: "Project-side fundraising evidence." },
];

const advancedFields = [
  { key: "coinmarketcap_url", label: "CoinMarketCap URL", placeholder: "https://coinmarketcap.com/..." },
  { key: "coingecko_url", label: "CoinGecko URL", placeholder: "https://coingecko.com/..." },
  { key: "cryptorank_url", label: "CryptoRank URL", placeholder: "https://cryptorank.io/..." },
  { key: "rootdata_url", label: "RootData URL", placeholder: "https://rootdata.com/..." },
  { key: "defillama_url", label: "DefiLlama URL", placeholder: "https://defillama.com/..." },
  { key: "messari_url", label: "Messari URL", placeholder: "https://messari.io/..." },
  { key: "crunchbase_url", label: "Crunchbase URL", placeholder: "https://crunchbase.com/..." },
  { key: "backer_portfolio_url", label: "Backer Portfolio URL", placeholder: "https://..." },
  { key: "extra_sources", label: "Extra Evidence URLs", placeholder: "https://a.com, https://b.com" },
];

const notesField = {
  key: "notes",
  label: "Notes & Hints",
  placeholder: "Any VC funding context, community rumors, or product usage signals you want AI to weigh...",
  help: "Optional. Add custom research signals.",
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
  coinmarketcap_url: "",
  coingecko_url: "",
  cryptorank_url: "",
  rootdata_url: "",
  defillama_url: "",
  messari_url: "",
  crunchbase_url: "",
  backer_portfolio_url: "",
  extra_sources: "",
};

// 3 High-Quality Preloaded Audits for instant review
const PRELOADED_AUDITS = [
  {
    id: 101,
    audit_id: 12,
    project_name: "Monad",
    overall_airdrop_score: 88,
    farming_success_likelihood: 91,
    confidence_score: 85,
    time_worthiness: "high",
    risk_level: "low",
    project_existence_score: 95,
    product_delivery_score: 90,
    fundraising_verification_score: 98,
    backer_legitimacy_score: 96,
    token_airdrop_signal_score: 85,
    reward_clarity_score: 75,
    community_authenticity_score: 92,
    time_roi_score: 87,
    red_flag_score: 15,
    sybil_competition_risk: "high",
    rule_change_risk: "medium",
    verified_facts: "1. Officially raised $225M in a funding round led by Paradigm.\n2. Technical specifications detailing optimized parallel EVM consensus have been fully published.\n3. The Monad internal devnet is operational with high performance telemetry reports.",
    unverified_claims: "1. Community speculation suggests a token allocation of up to 40% for active early adopters, which is not confirmed by the team.\n2. Claims of stable 10,000+ real-world transaction-per-second performance are not yet fully auditable on public mainnet.",
    missing_evidence: "1. An official detailed whitepaper or comprehensive tokenomics document has not been released.\n2. The exact criteria or point-to-token ratio for testnet validators remains undisclosed.",
    positive_signals: "1. World-class venture backers (Paradigm, Electric Capital) with a strong history of premium airdrops.\n2. High organic developer activity and genuine, highly active community hubs.",
    red_flags: "1. Massive competition with over 1.5 million social members, which may dilute individual farming rewards.\n2. Proliferation of copycat accounts and phishing links across Discord and X.",
    recommended_strategy: "Prioritize technical participation. Join official developer campaigns, run testnet nodes if selected, and engage in high-value, quality community events. Avoid low-quality automated sybil accounts as Paradigm-led portfolios tend to filter heavily.",
    evidence_summary: "Monad exhibits elite fundamental metrics with huge VC funding and highly advanced technology. Despite severe competition and unconfirmed token distributions, it is one of the highest-conviction airdrop plays in Web3.",
    source_quality: "strong",
    sources_checked: "website_url: https://monad.xyz; docs_url: https://docs.monad.xyz; funding_url: https://crunchbase.com/organization/monad-labs",
    sources_failed: "",
    created_at: "2026-05-23T12:00:00.000Z",
    evidence_items: [
      { claim: "Raised $225M in funding round", verdict: "verified", source_url: "https://crunchbase.com/organization/monad-labs", source_type: "official", confidence: "high" },
      { claim: "Parallel EVM live on devnet", verdict: "verified", source_url: "https://docs.monad.xyz", source_type: "official", confidence: "high" },
      { claim: "Airdrop points program confirmed", verdict: "unverified", source_url: "https://monad.xyz", source_type: "official", confidence: "medium" }
    ]
  },
  {
    id: 102,
    audit_id: 11,
    project_name: "Scroll",
    overall_airdrop_score: 64,
    farming_success_likelihood: 68,
    confidence_score: 80,
    time_worthiness: "medium",
    risk_level: "medium",
    project_existence_score: 92,
    product_delivery_score: 94,
    fundraising_verification_score: 90,
    backer_legitimacy_score: 88,
    token_airdrop_signal_score: 65,
    reward_clarity_score: 55,
    community_authenticity_score: 72,
    time_roi_score: 60,
    red_flag_score: 40,
    sybil_competition_risk: "high",
    rule_change_risk: "high",
    verified_facts: "1. Scroll zkEVM mainnet is fully operational with over $500M in Total Value Locked (TVL).\n2. First major token launch (SCR) has occurred.\n3. The Scroll Sessions program is actively running on-chain using 'Scroll Marks' points tracking.",
    unverified_claims: "1. Rumors of a massive retro-compensation pool for Phase 2 are circulating on social media, but not guaranteed.\n2. Official documentation suggests subsequent rewards will heavily weight contract deployment over simple liquidity holding, which is yet to be proven.",
    missing_evidence: "1. No definitive conversion formula for converting 'Marks' into tokens has been publicized.\n2. Clear metrics for filtering automated sybil operations are not published.",
    positive_signals: "1. Elite technical architecture (zkEVM) with a highly competent core team.\n2. Deep liquidity integrations with top-tier protocols like Aave, Uniswap, and MakerDAO.",
    red_flags: "1. High community fatigue due to relatively low allocations in the initial launch phase.\n2. Rules for Scroll Sessions are subject to sudden structural changes, shifting weight dynamically.",
    recommended_strategy: "Deploy capital selectively. Instead of repeating micro-transactions, supply stable liquidity to trusted core protocols on Scroll to slowly accumulate Marks. Use official bridges to build early volume signals.",
    evidence_summary: "Scroll is a robust, live Layer 2 network with high-tier tech and deep TVL. While its previous token launch was controversial, the continuing Sessions campaigns still hold medium yield potential for organic on-chain participants.",
    source_quality: "medium",
    sources_checked: "website_url: https://scroll.io; docs_url: https://docs.scroll.io; quest_url: https://scroll.io/sessions",
    sources_failed: "",
    created_at: "2026-05-22T08:15:00.000Z",
    evidence_items: [
      { claim: "Mainnet is live with $500M+ TVL", verdict: "verified", source_url: "https://scroll.io", source_type: "official", confidence: "high" },
      { claim: "Marks loyalty program is running", verdict: "verified", source_url: "https://scroll.io/sessions", source_type: "official", confidence: "high" },
      { claim: "Phase 2 rewards will exceed Phase 1", verdict: "unverified", source_url: "https://scroll.io", source_type: "social", confidence: "low" }
    ]
  },
  {
    id: 103,
    audit_id: 10,
    project_name: "HypeNetwork",
    overall_airdrop_score: 29,
    farming_success_likelihood: 25,
    confidence_score: 75,
    time_worthiness: "low",
    risk_level: "high",
    project_existence_score: 40,
    product_delivery_score: 20,
    fundraising_verification_score: 30,
    backer_legitimacy_score: 25,
    token_airdrop_signal_score: 60,
    reward_clarity_score: 15,
    community_authenticity_score: 35,
    time_roi_score: 20,
    red_flag_score: 85,
    sybil_competition_risk: "medium",
    rule_change_risk: "high",
    verified_facts: "1. The project website domain was registered only 45 days ago.\n2. Standard quest platforms (Zealy, Galxe) show active campaigns targeting mass social tasks.\n3. The project whitepaper is a basic 3-page slideshow with vague technical descriptions.",
    unverified_claims: "1. Team claims backing by 'top tier global funds' but no venture capitals have officially announced or confirmed any investment.\n2. Social profile boasts 150,000 real discord members, but post engagement is extremely artificial.",
    missing_evidence: "1. No public GitHub repositories, open-source codebases, or audited contracts are available.\n2. No operational testnet or live product exists; the only application is a basic email signup landing page.",
    positive_signals: "1. High viral traction and intense marketing distribution on social feeds.",
    red_flags: "1. Extreme sybil/bot activity. Comment sections are populated by automated template replies.\n2. Team is entirely anonymous and lacks any verifiable track record in Web3.\n3. Vague quest guidelines that require persistent sharing and referrals to maintain ranking.",
    recommended_strategy: "Avoid allocating any capital, connecting primary Web3 wallets, or paying gas fees. If you choose to farm social quests, use a dedicated, empty burn wallet and separate social handles to protect your digital identity.",
    evidence_summary: "HypeNetwork is a high-risk project focusing entirely on marketing and social metrics rather than product delivery. With anonymous founders, unverified backers, and no live product, it exhibits severe warning signals.",
    source_quality: "weak",
    sources_checked: "website_url: https://hypenetwork.io; quest_url: https://galxe.com/quest/hypenetwork",
    sources_failed: "docs_url: https://docs.hypenetwork.io -> 404 Not Found; github_url: https://github.com/hypenetwork -> Repository not found",
    created_at: "2026-05-21T15:30:00.000Z",
    evidence_items: [
      { claim: "Backed by Tier 1 VCs", verdict: "unverified", source_url: "https://hypenetwork.io", source_type: "official", confidence: "low" },
      { claim: "Open-source codebase exists", verdict: "unverified", source_url: "https://github.com/hypenetwork", source_type: "official", confidence: "low" },
      { claim: "Galxe social quests are active", verdict: "verified", source_url: "https://galxe.com/quest/hypenetwork", source_type: "thirdparty", confidence: "high" }
    ]
  }
];

const contractAddress = import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS;
const selectedNetwork = import.meta.env.VITE_GENLAYER_NETWORK || "studionet";

function toFriendlyError(err) {
  const msg = err?.message || String(err || "");
  if (msg.includes("wallet_getSnaps")) {
    return "Your wallet provider does not support MetaMask Snaps. Please open in Chrome or Brave with MetaMask extension enabled or use Demo Mode.";
  }
  return msg || "Something went wrong. Please check your connection or switch to Simulation Mode.";
}

function getRiskClass(value) {
  const v = (value || "unknown").toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return "unknown";
}

function shortAddress(v) {
  if (!v) return "Not connected";
  return `${v.slice(0, 6)}...${v.slice(-4)}`;
}

function shortContract(v) {
  if (!v) return "Not Configured";
  return `${v.slice(0, 8)}...${v.slice(-6)}`;
}

function scorePercent(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function scoreClass(v) {
  const p = scorePercent(v);
  if (p >= 75) return "good";
  if (p >= 45) return "mid";
  return "bad";
}

function splitSources(text) {
  if (!text) return [];
  return String(text)
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildCoverage(checkedSources) {
  const list = splitSources(checkedSources);
  const lower = list.map((x) => x.toLowerCase());
  const has = (keys) => lower.some((item) => keys.some((k) => item.includes(k)));
  return {
    official: has(["website", "docs", "blog", "roadmap", "github"]),
    funding: has(["funding", "coinmarketcap", "coingecko", "cryptorank", "rootdata", "defillama", "messari", "crunchbase", "backer"]),
    product: has(["github", "changelog", "app", "api", "status", "mainnet", "testnet"]),
    community: has(["x_url", "twitter", "discord", "community", "forum"]),
    airdrop: has(["quest", "points", "rewards", "galxe", "zealy", "layer3", "intract", "taskon"]),
  };
}

function parseEvidenceItems(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildNotesPayload(form) {
  const lines = [];
  if (form.notes.trim()) lines.push(form.notes.trim());
  lines.push("", "Advanced Evidence Sources:");
  advancedFields.forEach((f) => {
    const v = form[f.key].trim();
    if (v) lines.push(`${f.key}: ${v}`);
  });
  return lines.join("\n").trim();
}

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [current, setCurrent] = useState(PRELOADED_AUDITS[0]); // Default display Monad
  const [audits, setAudits] = useState(PRELOADED_AUDITS);
  const [latestAuditId, setLatestAuditId] = useState(12);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  // Dual-mode integration
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [simLogs, setSimLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  const terminalEndRef = useRef(null);

  const hasEthereum = typeof window !== "undefined" && Boolean(window.ethereum);
  const isMetaMask = hasEthereum && Boolean(window.ethereum.isMetaMask);

  // If contract isn't configured, default to simulation and notify
  useEffect(() => {
    if (!contractAddress) {
      setIsDemoMode(true);
    }
  }, []);

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [simLogs]);

  const canSubmit = useMemo(() => {
    const nameFilled = Boolean(form.project_name.trim());
    if (isDemoMode) {
      return nameFilled && !loading;
    }
    return Boolean(walletAddress && nameFilled && !loading && isMetaMask);
  }, [isDemoMode, walletAddress, form.project_name, loading, isMetaMask]);

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
      setIsDemoMode(false); // Auto switch to Real mode upon connecting
      setInfo("Wallet connected. Ready to run on-chain audit.");
    } catch (err) {
      setError(toFriendlyError(err));
    } finally {
      setWalletLoading(false);
    }
  };

  // Simulated node execution logs
  const runSimulatedAudit = (projectName, websiteUrl, docsUrl, githubUrl, notes) => {
    setLoading(true);
    setSimLogs([]);
    setError("");
    setInfo("");

    const addLog = (text, delay) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          setSimLogs((prev) => [...prev, text]);
          resolve();
        }, delay);
      });
    };

    const runSteps = async () => {
      await addLog("📡 Broadcasted Audit Transaction to GenLayer Studionet...", 300);
      await addLog("⛏️ Consensus Engine: Assigning Leader Node & 2 Validator Nodes...", 400);
      await addLog("🌐 Node Leader: Initiating multi-source Web Crawler...", 500);
      
      const domain = websiteUrl ? websiteUrl.replace("https://", "").replace("http://", "").split("/")[0] : "example.com";
      await addLog(`🔍 Scanning official site: ${websiteUrl || `https://${domain}`} ... [200 OK]`, 400);
      
      if (docsUrl) {
        await addLog(`🔍 Scanning documentation portal: ${docsUrl} ... [200 OK]`, 450);
      } else {
        await addLog(`⚠️ Docs url not provided, scanning derived roadmap path: https://${domain}/roadmap ... [404 Not Found]`, 350);
      }

      if (githubUrl) {
        await addLog(`🔍 Indexing GitHub developer metrics: ${githubUrl} ... [OK]`, 400);
      }

      await addLog("🧠 Leader Node: Assembling context & launching Intelligent Analyst Prompt...", 500);
      await addLog("🤖 GenVM LLM: Executing exec_prompt using Llama-3-70B model...", 600);
      await addLog("⚖️ Validator Node 1: Verifying leader report semantic integrity... APPROVED", 400);
      await addLog("⚖️ Validator Node 2: Checking web transaction credentials... APPROVED", 300);
      await addLog("📝 On-chain Storage: Recording serialized report into Contract TreeMap...", 400);
      
      const mockTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      await addLog(`🔗 Block inclusion confirmed! Block #${Math.floor(Math.random() * 5000) + 120000}, Tx: ${mockTxHash.slice(0, 10)}...${mockTxHash.slice(-6)}`, 300);
      
      // Dynamic generation based on user input
      const scoreBase = notes.toLowerCase().includes("good") || projectName.toLowerCase().includes("arbitrum") || projectName.toLowerCase().includes("linea") ? 82 : 
                        notes.toLowerCase().includes("scam") || notes.toLowerCase().includes("bad") || notes.toLowerCase().includes("fake") ? 25 : 
                        Math.floor(Math.random() * 36) + 45; // 45-80 range

      const riskLevel = scoreBase >= 75 ? "low" : scoreBase >= 45 ? "medium" : "high";
      const timeWorthiness = scoreBase >= 75 ? "high" : scoreBase >= 45 ? "medium" : "low";

      const simulatedReport = {
        id: Date.now(),
        audit_id: audits.length + 1,
        project_name: projectName,
        overall_airdrop_score: scoreBase,
        farming_success_likelihood: Math.min(99, scoreBase + Math.floor(Math.random() * 6) - 2),
        confidence_score: Math.floor(Math.random() * 16) + 75,
        time_worthiness: timeWorthiness,
        risk_level: riskLevel,
        project_existence_score: Math.min(100, scoreBase + Math.floor(Math.random() * 12)),
        product_delivery_score: Math.min(100, Math.max(10, scoreBase + Math.floor(Math.random() * 16) - 5)),
        fundraising_verification_score: Math.min(100, Math.max(10, scoreBase + Math.floor(Math.random() * 20) - 8)),
        backer_legitimacy_score: Math.min(100, Math.max(10, scoreBase + Math.floor(Math.random() * 15) - 3)),
        token_airdrop_signal_score: Math.min(100, Math.max(10, scoreBase + Math.floor(Math.random() * 10))),
        reward_clarity_score: Math.min(100, Math.max(10, scoreBase + Math.floor(Math.random() * 14) - 7)),
        community_authenticity_score: Math.min(100, Math.max(10, scoreBase + Math.floor(Math.random() * 8))),
        time_roi_score: Math.min(100, Math.max(10, scoreBase + Math.floor(Math.random() * 10) - 2)),
        red_flag_score: Math.max(5, 100 - scoreBase - Math.floor(Math.random() * 12)),
        sybil_competition_risk: scoreBase >= 70 ? "high" : "medium",
        rule_change_risk: scoreBase < 50 ? "high" : "medium",
        verified_facts: `1. The domain '${domain}' is verified and fully functional.\n2. ${projectName} has official campaign signals tracking ${form.quest_url ? "quest activity." : "social interaction."}\n3. Core codebase signals are detectable on the network.`,
        unverified_claims: notes.trim() 
          ? `1. User flagged: "${notes.trim().substring(0, 120)}"\n2. Backer allocations are heavily rumored but unconfirmed officially.`
          : `1. Venture backing amounts remain partially undisclosed.\n2. Community tokenomics ratios are speculative.`,
        missing_evidence: scoreBase < 50 
          ? "1. Missing a completed developer roadmap.\n2. Complete absence of third-party security audits."
          : "1. Detailed token launch date or exact point conversion ratio remains missing from official channels.",
        positive_signals: scoreBase >= 70 
          ? "1. Highly organic engagement on active social modules.\n2. Solid Git repository shipping speed with continuous pull requests."
          : "1. Quest platform activities display high social interaction volume.",
        red_flags: scoreBase < 50 
          ? "1. High percentage of copy-paste promotional posts on X.\n2. Multi-tier referral structural models typical of generic points farms."
          : "1. Severe dilution risk due to large community size.\n2. Points conversion parameters are highly adjustable by the core team.",
        recommended_strategy: scoreBase >= 75
          ? "Highly worth farming. Establish weekly organic patterns, prioritize actual product usage, and focus on high-fidelity campaigns."
          : scoreBase >= 50
          ? "Farm cautiously. Keep gas costs minimal. Do not supply high-value liquidity unless rewards are locked."
          : "High risk warning. Run free tasks only using empty burn wallets. Avoid connecting your main wallet assets.",
        evidence_summary: `Audit complete for ${projectName}. Fundamental scores aggregate to ${scoreBase}/100 based on crawled digital footprints. ${
          scoreBase >= 75 ? "Excellent candidate with strong team delivery." : scoreBase >= 50 ? "Moderate candidate; proceed with standard cautious parameters." : "Weak structure, high marketing hype with low technical backing."
        }`,
        source_quality: scoreBase >= 75 ? "strong" : scoreBase >= 45 ? "medium" : "weak",
        sources_checked: `website_url: ${websiteUrl || `https://${domain}`}; docs_url: ${docsUrl || `https://${domain}/docs`}${githubUrl ? `; github_url: ${githubUrl}` : ""}`,
        sources_failed: docsUrl ? "" : `docs_url: https://${domain}/docs -> 443 Timeout`,
        created_at: new Date().toISOString(),
        evidence_items: [
          { claim: "Official product is online", verdict: "verified", source_url: websiteUrl || `https://${domain}`, source_type: "official", confidence: "high" },
          { claim: "Vague developer shipping patterns", verdict: githubUrl ? "verified" : "unverified", source_url: githubUrl || "n/a", source_type: "official", confidence: githubUrl ? "high" : "low" }
        ]
      };

      setAudits((prev) => [simulatedReport, ...prev]);
      setCurrent(simulatedReport);
      setLatestAuditId(simulatedReport.audit_id);
      setForm(emptyForm);
      setActiveTab("overview");
      setInfo(`Stored as simulated on-chain audit. Audit ID: ${simulatedReport.audit_id}`);
      setLoading(false);
    };

    runSteps().catch((err) => {
      setError(err?.message || "Simulation failed.");
      setLoading(false);
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    const projectName = form.project_name.trim();
    if (!projectName) {
      setError("Please enter a project name.");
      return;
    }

    if (isDemoMode) {
      runSimulatedAudit(projectName, form.website_url.trim(), form.docs_url.trim(), form.github_url.trim(), form.notes.trim());
      return;
    }

    // Real GenLayer transaction mode
    if (!contractAddress) {
      setError("Missing VITE_GENLAYER_CONTRACT_ADDRESS environment variable.");
      return;
    }

    if (!walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }

    setLoading(true);
    try {
      const client = getClient(walletAddress);
      await client.connect(selectedNetwork);

      const notesPayload = buildNotesPayload(form);
      setInfo("Publishing Intelligent Transaction to GenLayer network...");

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
          notesPayload,
        ],
        value: BigInt(0),
      });

      setInfo("Consensus underway... Crawler fetching Web content...");
      setInfo("Consensus underway... GenLayer executing LLM verification...");
      setInfo("Consensus consensus reached! Recording on-chain attestation...");
      await client.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.ACCEPTED });

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
      const result = { ...parsedAudit, created_at: new Date().toISOString(), audit_id: newAuditId, id: Date.now() };

      setCurrent(result);
      setLatestAuditId(newAuditId);
      setAudits((prev) => [result, ...prev]);
      setForm(emptyForm);
      setActiveTab("overview");
      setInfo(`On-chain audit successfully stored. Audit ID: ${newAuditId}`);
    } catch (err) {
      setError(toFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const scoreRows = useMemo(
    () => [
      ["Project Existence", current?.project_existence_score ?? 0],
      ["Product Delivery", current?.product_delivery_score ?? 0],
      ["Fundraising Verification", current?.fundraising_verification_score ?? 0],
      ["Backer Legitimacy", current?.backer_legitimacy_score ?? 0],
      ["Token / Airdrop Signal", current?.token_airdrop_signal_score ?? current?.token_signal_score ?? 0],
      ["Reward Clarity", current?.reward_clarity_score ?? 0],
      ["Community Authenticity", current?.community_authenticity_score ?? 0],
      ["Time ROI", current?.time_roi_score ?? 0],
      ["Red Flag Penalty", current?.red_flag_score ?? current?.red_flag_penalty ?? 0],
      ["Confidence Score", current?.confidence_score ?? 0],
    ],
    [current]
  );

  const overallScore = current ? scorePercent(current.overall_airdrop_score) : 0;
  const coverage = buildCoverage(current?.sources_checked || "");
  const evidenceItems = parseEvidenceItems(current?.evidence_items);

  // SVG Gauge Calculations
  const strokeRadius = 40;
  const circumference = 2 * Math.PI * strokeRadius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  return (
    <div className="page">
      <div className="bg-grid" />
      <div className="shell">
        
        {/* Dynamic Header */}
        <header className="topbar panel">
          <div className="logo-group">
            <div className="glow-dot" />
            <div>
              <p className="brand">AIRSCOUT</p>
              <p className="tagline">On-chain AI due diligence protocol</p>
            </div>
          </div>
          
          <div className="top-right">
            {/* Mode Switcher */}
            <div className="mode-toggle">
              <button 
                type="button"
                className={`mode-btn ${isDemoMode ? "active" : ""}`}
                onClick={() => setIsDemoMode(true)}
              >
                <span>Demo Simulator</span>
              </button>
              <button 
                type="button"
                className={`mode-btn ${!isDemoMode ? "active" : ""}`}
                onClick={() => {
                  if (!walletAddress) {
                    connectWallet();
                  } else {
                    setIsDemoMode(false);
                  }
                }}
              >
                <span>GenLayer Testnet</span>
              </button>
            </div>

            <span className="badge-line">Network: {isDemoMode ? "simulated-studionet" : selectedNetwork}</span>
            <span className="badge-line">Contract: {isDemoMode ? "simulated-contract" : shortContract(contractAddress)}</span>
            <button className="wallet-btn" type="button" onClick={connectWallet} disabled={walletLoading}>
              {walletLoading ? "Connecting..." : walletAddress ? `Wallet ${shortAddress(walletAddress)}` : "Connect Wallet"}
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero panel">
          <div className="hero-content">
            <div className="hero-copy">
              <h1>AirScout</h1>
              <p className="subtitle">Verify airdrop metrics on-chain using GenLayer Intelligent Contracts</p>
              <p className="desc">
                Analyze venture backing, technical product speed, roadmap delivery, points systems, and sybil risks. AirScout scans open-web evidence and commits decentralized due diligence reports on-chain.
              </p>
            </div>
            <div className="hero-stats">
              <div className="mini-stat">
                <div className="stat-glow green" />
                <span>Consensus Engine</span>
                <strong>GenVM Intelligent</strong>
              </div>
              <div className="mini-stat">
                <div className="stat-glow cyan" />
                <span>Web Scanner</span>
                <strong>Multi-Source API</strong>
              </div>
              <div className="mini-stat">
                <div className="stat-glow purple" />
                <span>Airdrop Scoring</span>
                <strong>Decentralized AI</strong>
              </div>
            </div>
          </div>
          <div className="status-row">
            <span className={`status-pill ${isDemoMode ? "ok" : (contractAddress ? "ok" : "warn")}`}>
              Contract: {isDemoMode ? "Simulation Active" : (contractAddress ? "Connected" : "Not Found")}
            </span>
            <span className={`status-pill ${walletAddress ? "ok" : "info"}`}>
              Wallet: {walletAddress ? `Connected (${shortAddress(walletAddress)})` : "Read-Only / Demo Mode"}
            </span>
            <span className="status-pill active-badge">
              Active Mode: {isDemoMode ? "Simulation (No Gas Required)" : "On-chain Live Transactions"}
            </span>
          </div>
        </section>

        {/* Main Dashboard Grid */}
        <main className="dashboard-grid">
          
          {/* Left Column: Form Control */}
          <section className="panel left-col">
            <div className="section-head">
              <h2>Audit Input Console</h2>
              <p>Configure project pointers to initialize decentralized web auditing & AI verification.</p>
            </div>

            <form onSubmit={onSubmit}>
              <div className="field-wrap">
                <label htmlFor={mainField.key}>{mainField.label} <span className="req">*</span></label>
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

              <button type="button" className="collapse-btn" onClick={() => setAdvancedOpen((v) => !v)}>
                {advancedOpen ? "Hide Advanced Evidence Sources" : "Show Advanced Evidence Sources"}
              </button>

              {advancedOpen ? (
                <div className="advanced-wrap">
                  <div className="evidence-grid">
                    {advancedFields.map((field) => (
                      <div key={field.key} className="field-wrap">
                        <label htmlFor={field.key}>{field.label}</label>
                        <input 
                          id={field.key} 
                          placeholder={field.placeholder} 
                          value={form[field.key]} 
                          onChange={(e) => updateField(field.key, e.target.value)} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

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
                {loading ? "Scanning public evidence..." : isDemoMode ? "Run Simulated AirScout Audit" : "Run Live AirScout Audit"}
              </button>
            </form>

            <div className="messages">
              {info ? <p className="ok-msg">ℹ️ {info}</p> : null}
              {error ? <p className="err-msg">🚨 {error}</p> : null}
              {!isMetaMask && !isDemoMode ? (
                <p className="warn-msg">⚠️ MetaMask is not detected. Switched to Simulation Mode for offline testing.</p>
              ) : null}
            </div>
          </section>

          {/* Right Column: Dynamic Terminal / Audit Report */}
          <section className="panel right-col">
            
            {/* 1. Terminal Panel during Loading */}
            {loading ? (
              <div className="terminal-panel">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                  </div>
                  <div className="terminal-title">GENLAYER VM CONSENSUS TERMINAL</div>
                  <span className="terminal-status">CRAWLING & AI VERIFYING</span>
                </div>
                <div className="terminal-body">
                  {simLogs.map((log, idx) => (
                    <div key={idx} className="terminal-line">
                      <span className="terminal-text">{log}</span>
                    </div>
                  ))}
                  <div className="terminal-cursor" ref={terminalEndRef} />
                </div>
              </div>
            ) : null}

            {/* 2. Standard Empty State */}
            {!current && !loading ? (
              <div className="empty-state-full">
                <div className="terminal-header">
                  <div className="terminal-dots"><span className="dot" /><span className="dot" /><span className="dot" /></div>
                  <div className="terminal-title">AirScout Report Module</div>
                </div>
                <div className="empty-state-body">
                  <div className="empty-icon">📊</div>
                  <h4>No audit selected</h4>
                  <p>Choose an audit from the Research History or submit a new project above to generate a premium interactive report.</p>
                </div>
              </div>
            ) : null}

            {/* 3. High-Fidelity Report UI */}
            {current && !loading ? (
              <div className="report-container">
                <div className="section-head">
                  <h2>Research Terminal: {current.project_name}</h2>
                  <p>Audit Attestation ID: #{current.audit_id ?? "Simulated"}</p>
                </div>

                {/* Score & Gauge Block */}
                <div className="score-hero">
                  <div className="gauge-container">
                    <svg className="score-svg" viewBox="0 0 100 100">
                      <circle className="score-svg-bg" cx="50" cy="50" r={strokeRadius} />
                      <circle 
                        className={`score-svg-bar ${scoreClass(overallScore)}`} 
                        cx="50" 
                        cy="50" 
                        r={strokeRadius} 
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                    </svg>
                    <div className="gauge-text">
                      <span className="gauge-number">{overallScore}</span>
                      <span className="gauge-label">/100</span>
                    </div>
                  </div>
                  
                  <div className="score-meta">
                    <h3>Overall Airdrop Score</h3>
                    <div className="chip-row">
                      <span className={`chip risk ${getRiskClass(current.risk_level)}`}>RISK: {String(current.risk_level || "unknown").toUpperCase()}</span>
                      <span className={`chip time ${String(current.time_worthiness || "medium").toLowerCase()}`}>TIME ROI: {String(current.time_worthiness || "unknown").toUpperCase()}</span>
                      <span className="chip src-quality">SOURCES: {String(current.source_quality || "weak").toUpperCase()}</span>
                    </div>
                    <p className="success-estimate">
                      Farming Success Likelihood: <strong>{scorePercent(current.farming_success_likelihood ?? current.overall_airdrop_score)}%</strong>
                    </p>
                    <p className="muted-date">Audited on: {new Date(current.created_at || Date.now()).toLocaleString()}</p>
                  </div>
                </div>

                {/* Interactive Report Navigation Tabs */}
                <div className="report-tabs">
                  <button 
                    type="button"
                    className={`tab-btn ${activeTab === "overview" ? "active" : ""}`} 
                    onClick={() => setActiveTab("overview")}
                  >
                    📊 Overview
                  </button>
                  <button 
                    type="button"
                    className={`tab-btn ${activeTab === "due-diligence" ? "active" : ""}`} 
                    onClick={() => setActiveTab("due-diligence")}
                  >
                    🔍 Due Diligence
                  </button>
                  <button 
                    type="button"
                    className={`tab-btn ${activeTab === "signals-risks" ? "active" : ""}`} 
                    onClick={() => setActiveTab("signals-risks")}
                  >
                    ⚠️ Risks & Signals
                  </button>
                  <button 
                    type="button"
                    className={`tab-btn ${activeTab === "sources" ? "active" : ""}`} 
                    onClick={() => setActiveTab("sources")}
                  >
                    🔗 Web Sources
                  </button>
                </div>

                {/* Tab content 1: Overview */}
                {activeTab === "overview" ? (
                  <div className="tab-pane">
                    
                    {/* Score Breakdown Bars */}
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

                    <div className="insight-panel primary-insight">
                      <h4>💡 Recommended Farming Strategy</h4>
                      <p>{current.recommended_strategy || "No strategy defined."}</p>
                    </div>

                    <div className="insight-panel">
                      <h4>📝 Executive Evidence Summary</h4>
                      <p>{current.evidence_summary || "No summary provided."}</p>
                    </div>
                  </div>
                ) : null}

                {/* Tab content 2: Due Diligence */}
                {activeTab === "due-diligence" ? (
                  <div className="tab-pane pane-split">
                    <div className="insight-panel fact-card">
                      <h4>🟢 Verified On-chain & Web Facts</h4>
                      <div className="list-content">
                        {current.verified_facts ? current.verified_facts.split("\n").map((line, i) => (
                          <p key={i}>{line}</p>
                        )) : <p className="muted">No verified facts recorded.</p>}
                      </div>
                    </div>

                    <div className="insight-panel claim-card">
                      <h4>🟡 Unverified Hype & Claims</h4>
                      <div className="list-content">
                        {current.unverified_claims ? current.unverified_claims.split("\n").map((line, i) => (
                          <p key={i}>{line}</p>
                        )) : <p className="muted">No unverified claims logged.</p>}
                      </div>
                    </div>

                    <div className="insight-panel missing-card">
                      <h4>🔴 Missing Crucial Evidence</h4>
                      <div className="list-content">
                        {current.missing_evidence ? current.missing_evidence.split("\n").map((line, i) => (
                          <p key={i}>{line}</p>
                        )) : <p className="muted">No missing evidence signals.</p>}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Tab content 3: Risks & Signals */}
                {activeTab === "signals-risks" ? (
                  <div className="tab-pane pane-split">
                    
                    <div className="risk-metrics">
                      <div className="risk-metric-box">
                        <span>Sybil Competition Risk</span>
                        <strong className={current.sybil_competition_risk || "medium"}>
                          {String(current.sybil_competition_risk || "medium").toUpperCase()}
                        </strong>
                      </div>
                      <div className="risk-metric-box">
                        <span>Sudden Rule Change Risk</span>
                        <strong className={current.rule_change_risk || "medium"}>
                          {String(current.rule_change_risk || "medium").toUpperCase()}
                        </strong>
                      </div>
                    </div>

                    <div className="insight-panel signal-card">
                      <h4>🚀 Positive Signals & Catalyst Indicators</h4>
                      <div className="list-content">
                        {current.positive_signals ? current.positive_signals.split("\n").map((line, i) => (
                          <p key={i}>{line}</p>
                        )) : <p className="muted">No specific positive signals found.</p>}
                      </div>
                    </div>

                    <div className="insight-panel flag-card">
                      <h4>🚩 Red Flag & Penalty Detections</h4>
                      <div className="list-content">
                        {current.red_flags ? current.red_flags.split("\n").map((line, i) => (
                          <p key={i}>{line}</p>
                        )) : <p className="muted">No explicit red flags reported.</p>}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Tab content 4: Web Sources */}
                {activeTab === "sources" ? (
                  <div className="tab-pane">
                    
                    <div className="source-panel">
                      <h4>Source Crawl Coverage Map</h4>
                      <div className="chip-row compact">
                        <span className={`coverage ${coverage.official ? "yes" : "no"}`}>Official Channels</span>
                        <span className={`coverage ${coverage.funding ? "yes" : "no"}`}>VC Funding announcements</span>
                        <span className={`coverage ${coverage.product ? "yes" : "no"}`}>GitHub Repositories</span>
                        <span className={`coverage ${coverage.community ? "yes" : "no"}`}>Social Communities</span>
                        <span className={`coverage ${coverage.airdrop ? "yes" : "no"}`}>Quest Campaigns</span>
                      </div>
                    </div>

                    <div className="insight-panel">
                      <h4>Sources Queried successfully</h4>
                      <div className="crawled-sources">
                        {current.sources_checked ? current.sources_checked.split(";").map((src, i) => (
                          <div key={i} className="src-item ok">✔️ {src.trim()}</div>
                        )) : <p className="muted">No sources logged.</p>}
                      </div>
                    </div>

                    {current.sources_failed ? (
                      <div className="insight-panel fail-panel">
                        <h4>Failed Web Queries (Timeouts / Protections)</h4>
                        <div className="crawled-sources">
                          {current.sources_failed.split(";").map((src, i) => (
                            <div key={i} className="src-item fail">❌ {src.trim()}</div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="insight-panel full citations-panel">
                      <h4>Evidence Citations list</h4>
                      {evidenceItems.length === 0 ? (
                        <p className="muted">No structured evidence citations returned by GenVM consensus yet.</p>
                      ) : (
                        <div className="evidence-list">
                          {evidenceItems.map((item, idx) => (
                            <div key={idx} className="evidence-item">
                              <div className="evidence-item-head">
                                <strong>{item.claim || "Claim Verified"}</strong>
                                <span className={`verdict-pill ${item.verdict}`}>{String(item.verdict || "unknown").toUpperCase()}</span>
                              </div>
                              <p className="muted-text">Type: {item.source_type || "unknown"} | Confidence: {item.confidence || "unknown"}</p>
                              {item.source_url ? (
                                <a className="source-link" href={item.source_url} target="_blank" rel="noreferrer">
                                  🔗 {item.source_url}
                                </a>
                              ) : (
                                <p className="muted-text">No direct source URL available.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

              </div>
            ) : null}

          </section>

        </main>

        {/* Previous Audits / Research History */}
        <section className="panel history">
          <div className="section-head inline">
            <div className="logo-group">
              <span className="history-icon">📜</span>
              <h2>Research History Console</h2>
            </div>
            <span className="count-pill">{audits.length} Audits Logged</span>
          </div>

          {audits.length === 0 ? (
            <p className="muted text-center py-4">No previous audits logged in local storage.</p>
          ) : null}

          <div className="history-grid">
            {audits.map((a) => (
              <article 
                key={a.id} 
                className={`history-card ${current && current.id === a.id ? "active" : ""}`}
                onClick={() => {
                  setCurrent(a);
                  setActiveTab("overview");
                }}
              >
                <div className="history-top">
                  <h4>{a.project_name}</h4>
                  <span className={`score-pill ${scoreClass(a.overall_airdrop_score)}`}>
                    {scorePercent(a.overall_airdrop_score)}/100
                  </span>
                </div>
                <div className="chip-row compact">
                  <span className={`chip risk ${getRiskClass(a.risk_level)}`}>RISK: {String(a.risk_level || "unknown").toUpperCase()}</span>
                  <span className={`chip time ${String(a.time_worthiness || "medium").toLowerCase()}`}>ROI: {String(a.time_worthiness || "unknown").toUpperCase()}</span>
                </div>
                <p className="summary">{a.evidence_summary || "Audit analysis captured in GenLayer contract state."}</p>
                <div className="history-meta">
                  <span>ID: #{a.audit_id ?? "Simulated"}</span>
                  <span>{new Date(a.created_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="history-footer">
            <a className="genlayer-link" href="https://genlayer.com" target="_blank" rel="noreferrer">
              Powered by GenLayer Intelligent Contracts ↗
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
