# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class Contract(gl.Contract):
    total_audits: u256
    audit_project_names: TreeMap[u256, str]
    audit_scores: TreeMap[u256, u256]
    audit_confidence_scores: TreeMap[u256, u256]
    audit_risk_levels: TreeMap[u256, str]
    audit_time_worthiness: TreeMap[u256, str]
    audit_summary: TreeMap[u256, str]
    audit_red_flags: TreeMap[u256, str]
    audit_positive_signals: TreeMap[u256, str]
    audit_strategy: TreeMap[u256, str]
    audit_sources_checked: TreeMap[u256, str]
    audit_raw_json: TreeMap[u256, str]
    project_latest_audit: TreeMap[str, u256]

    def __init__(self):
        self.total_audits = u256(0)

    def _clamp_score(self, n: int) -> int:
        if n < 0:
            return 0
        if n > 100:
            return 100
        return n

    def _to_level(self, value: str, allowed_csv: str, fallback: str) -> str:
        v = (value or "").strip().lower()
        allowed = [x.strip() for x in allowed_csv.split(",")]
        if v in allowed:
            return v
        return fallback

    def _safe_int(self, value, fallback: int) -> int:
        try:
            return int(value)
        except Exception:
            return fallback

    def _slugify(self, text: str) -> str:
        s = (text or "").strip().lower()
        out = ""
        last_dash = False
        for ch in s:
            ok = ("a" <= ch <= "z") or ("0" <= ch <= "9")
            if ok:
                out += ch
                last_dash = False
            elif not last_dash:
                out += "-"
                last_dash = True
        return out.strip("-")

    def _base_domain(self, website_url: str) -> str:
        raw = (website_url or "").strip().lower()
        if raw == "":
            return ""
        if raw.startswith("https://"):
            raw = raw[8:]
        elif raw.startswith("http://"):
            raw = raw[7:]
        if raw.startswith("www."):
            raw = raw[4:]
        slash = raw.find("/")
        if slash >= 0:
            raw = raw[:slash]
        return raw

    def _extract_extra_sources(self, notes: str) -> dict:
        out = {}
        text = notes or ""
        lines = text.split("\n")
        for line in lines:
            stripped = line.strip()
            if stripped == "":
                continue
            parts = stripped.split(":", 1)
            if len(parts) == 2:
                k = parts[0].strip().lower().replace(" ", "_")
                v = parts[1].strip()
                if v.startswith("http://") or v.startswith("https://"):
                    out[k] = v
            tokens = stripped.replace(",", " ").replace(";", " ").split(" ")
            for token in tokens:
                t = token.strip()
                if t.startswith("http://") or t.startswith("https://"):
                    out[t] = t
        return out

    @gl.public.write
    def create_audit(
        self,
        project_name: str,
        website_url: str,
        docs_url: str,
        x_url: str,
        quest_url: str,
        github_url: str,
        funding_url: str,
        notes: str,
    ) -> int:
        slug = self._slugify(project_name)
        domain = self._base_domain(website_url)

        base_sources = {
            "website_url": website_url,
            "docs_url": docs_url,
            "x_url": x_url,
            "quest_url": quest_url,
            "github_url": github_url,
            "funding_url": funding_url,
        }

        extra = self._extract_extra_sources(notes)

        derived_sources = {}
        if domain != "":
            derived_sources["blog_url"] = f"https://{domain}/blog"
            derived_sources["changelog_url"] = f"https://{domain}/changelog"
            derived_sources["roadmap_url"] = f"https://{domain}/roadmap"
            derived_sources["tokenomics_url"] = f"https://{domain}/tokenomics"
            derived_sources["rewards_url"] = f"https://{domain}/rewards"
            derived_sources["points_url"] = f"https://{domain}/points"
            derived_sources["faq_url"] = f"https://{domain}/faq"

        if slug != "":
            derived_sources["coinmarketcap_url"] = f"https://coinmarketcap.com/currencies/{slug}/"
            derived_sources["coingecko_url"] = f"https://www.coingecko.com/en/coins/{slug}"
            derived_sources["cryptorank_url"] = f"https://cryptorank.io/price/{slug}"
            derived_sources["rootdata_url"] = f"https://www.rootdata.com/Projects/detail/{slug}"
            derived_sources["defillama_raises_url"] = f"https://defillama.com/raises?search={slug}"

        candidate_pairs = []
        seen = {}

        def add_pair(name: str, url: str):
            u = (url or "").strip()
            if u == "":
                return
            if not (u.startswith("http://") or u.startswith("https://")):
                return
            if u in seen:
                return
            seen[u] = True
            candidate_pairs.append((name, u))

        for k, v in base_sources.items():
            add_pair(k, v)
        for k, v in derived_sources.items():
            add_pair(k, v)
        for k, v in extra.items():
            add_pair(k, v)

        candidate_pairs = candidate_pairs[:30]

        def leader_fn():
            collected = {}
            checked = []
            failed = []

            for name, url in candidate_pairs:
                checked.append(f"{name}:{url}")
                try:
                    content = gl.nondet.web.render(url, mode="text")
                    collected[name] = str(content)[:5000]
                except Exception as e:
                    failed.append(f"{name}:{url} -> {str(e)[:180]}")

            evidence_block = ""
            for name, text in collected.items():
                evidence_block += f"\n\nSOURCE[{name}]\n{text}"

            task = (
                "You are a Web3 due diligence analyst for airdrop hunters. "
                "You must be evidence-based, cautious, and never guarantee an airdrop. "
                "Avoid calling a project scam without hard proof. "
                "Separate verified facts, unverified claims, unclear signals, and red flags.\n\n"
                "Source reliability ranking:\n"
                "Highest: official project docs/blog/github, official investor or backer websites, verified project pages.\n"
                "Medium: RootData, CryptoRank, DefiLlama, Messari, Crunchbase, reputable media.\n"
                "Lower: random blogs, speculation, unverified posts, weak social chatter.\n\n"
                f"Project name: {project_name}\n"
                f"User notes and hints:\n{notes}\n\n"
                f"Sources checked list:\n{'; '.join(checked)}\n\n"
                f"Sources failed list:\n{'; '.join(failed)}\n\n"
                "Analyze whether the campaign is worth farming for time ROI. "
                "Penalize hype without product, unverified backer claims, vague points with unclear reward mapping, and weak source quality.\n\n"
                "Return JSON only with keys exactly:\n"
                "project_name, overall_airdrop_score, confidence_score, time_worthiness, risk_level, "
                "project_existence_score, product_delivery_score, fundraising_verification_score, backer_legitimacy_score, "
                "token_airdrop_signal_score, reward_clarity_score, community_authenticity_score, time_roi_score, red_flag_score, "
                "sybil_competition_risk, rule_change_risk, verified_facts, unverified_claims, missing_evidence, positive_signals, "
                "red_flags, recommended_strategy, evidence_summary, source_quality, sources_checked, sources_failed, "
                "farming_success_likelihood, evidence_items.\n"
                "sources_checked and sources_failed should be concise text summaries. "
                "evidence_items should be a JSON array of short objects with keys: claim, verdict, source_url, source_type, confidence."
                f"\n\nCollected evidence:{evidence_block}"
            )

            return gl.nondet.exec_prompt(task, response_format="json")

        def validator_fn(leader_result) -> bool:
            return isinstance(leader_result, gl.vm.Return)

        llm_output = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        raw_text = llm_output if isinstance(llm_output, str) else str(llm_output)

        try:
            parsed = json.loads(raw_text)
        except Exception:
            parsed = {}

        project_existence = self._clamp_score(self._safe_int(parsed.get("project_existence_score", 45), 45))
        product_delivery = self._clamp_score(self._safe_int(parsed.get("product_delivery_score", 45), 45))
        fundraising_verify = self._clamp_score(self._safe_int(parsed.get("fundraising_verification_score", 40), 40))
        backer_legit = self._clamp_score(self._safe_int(parsed.get("backer_legitimacy_score", 40), 40))
        token_signal = self._clamp_score(self._safe_int(parsed.get("token_airdrop_signal_score", parsed.get("token_signal_score", 45)), 45))
        reward_clarity = self._clamp_score(self._safe_int(parsed.get("reward_clarity_score", 45), 45))
        community_auth = self._clamp_score(self._safe_int(parsed.get("community_authenticity_score", 45), 45))
        time_roi = self._clamp_score(self._safe_int(parsed.get("time_roi_score", 45), 45))
        red_flag_score = self._clamp_score(self._safe_int(parsed.get("red_flag_score", 45), 45))
        confidence_score = self._clamp_score(self._safe_int(parsed.get("confidence_score", 45), 45))

        weighted = int(
            (0.20 * product_delivery)
            + (0.15 * token_signal)
            + (0.15 * reward_clarity)
            + (0.15 * fundraising_verify)
            + (0.10 * backer_legit)
            + (0.10 * community_auth)
            + (0.10 * time_roi)
            + (0.05 * project_existence)
            - (0.12 * red_flag_score)
        )
        overall = self._clamp_score(weighted)
        farming_success_likelihood = self._clamp_score(self._safe_int(parsed.get("farming_success_likelihood", overall), overall))

        sybil_risk = self._to_level(parsed.get("sybil_competition_risk", "unknown"), "low,medium,high,unknown", "unknown")
        rule_risk = self._to_level(parsed.get("rule_change_risk", "unknown"), "low,medium,high,unknown", "unknown")
        risk_level = self._to_level(parsed.get("risk_level", "unknown"), "low,medium,high,unknown", "unknown")
        time_worthiness = self._to_level(parsed.get("time_worthiness", "unknown"), "high,medium,low,unknown", "unknown")
        source_quality = self._to_level(parsed.get("source_quality", "weak"), "strong,medium,weak", "weak")

        payload = {
            "project_name": project_name,
            "overall_airdrop_score": overall,
            "confidence_score": confidence_score,
            "time_worthiness": time_worthiness,
            "risk_level": risk_level,
            "project_existence_score": project_existence,
            "product_delivery_score": product_delivery,
            "fundraising_verification_score": fundraising_verify,
            "backer_legitimacy_score": backer_legit,
            "token_airdrop_signal_score": token_signal,
            "token_signal_score": token_signal,
            "reward_clarity_score": reward_clarity,
            "community_authenticity_score": community_auth,
            "time_roi_score": time_roi,
            "red_flag_score": red_flag_score,
            "project_quality_score": project_existence,
            "sybil_competition_risk": sybil_risk,
            "rule_change_risk": rule_risk,
            "verified_facts": str(parsed.get("verified_facts", "Insufficient verified facts.")),
            "unverified_claims": str(parsed.get("unverified_claims", "No clear unverified claims extracted.")),
            "missing_evidence": str(parsed.get("missing_evidence", "Missing evidence not explicitly reported.")),
            "positive_signals": str(parsed.get("positive_signals", "No strong positive signals confirmed.")),
            "red_flags": str(parsed.get("red_flags", "No major red flags explicitly confirmed.")),
            "recommended_strategy": str(parsed.get("recommended_strategy", "Farm selectively and prioritize transparent, shipped products.")),
            "evidence_summary": str(parsed.get("evidence_summary", "Evidence review complete with uncertainty-aware interpretation.")),
            "source_quality": source_quality,
            "sources_checked": str(parsed.get("sources_checked", "; ".join([x[0] for x in candidate_pairs]))),
            "sources_failed": str(parsed.get("sources_failed", "")),
            "farming_success_likelihood": farming_success_likelihood,
            "evidence_items": parsed.get("evidence_items", []),
        }

        audit_id = int(self.total_audits)
        key = u256(audit_id)

        self.audit_project_names[key] = project_name
        self.audit_scores[key] = u256(overall)
        self.audit_confidence_scores[key] = u256(confidence_score)
        self.audit_risk_levels[key] = risk_level
        self.audit_time_worthiness[key] = time_worthiness
        self.audit_summary[key] = payload["evidence_summary"]
        self.audit_red_flags[key] = payload["red_flags"]
        self.audit_positive_signals[key] = payload["positive_signals"]
        self.audit_strategy[key] = payload["recommended_strategy"]
        self.audit_sources_checked[key] = payload["sources_checked"]
        self.audit_raw_json[key] = json.dumps(payload)
        self.project_latest_audit[project_name] = key
        self.total_audits = u256(audit_id + 1)

        return audit_id

    @gl.public.view
    def get_audit(self, audit_id: int) -> str:
        return self.audit_raw_json[u256(audit_id)]

    @gl.public.view
    def get_total_audits(self) -> int:
        return int(self.total_audits)

    @gl.public.view
    def get_project_latest(self, project_name: str) -> int:
        return int(self.project_latest_audit[project_name])
