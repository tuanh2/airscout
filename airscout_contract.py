# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class Contract(gl.Contract):
    total_audits: u256
    audit_project_names: TreeMap[u256, str]
    audit_scores: TreeMap[u256, u256]
    audit_risk_levels: TreeMap[u256, str]
    audit_time_worthiness: TreeMap[u256, str]
    audit_summary: TreeMap[u256, str]
    audit_red_flags: TreeMap[u256, str]
    audit_positive_signals: TreeMap[u256, str]
    audit_strategy: TreeMap[u256, str]
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
        urls = {
            "website_url": website_url,
            "docs_url": docs_url,
            "x_url": x_url,
            "quest_url": quest_url,
            "github_url": github_url,
            "funding_url": funding_url,
        }

        def leader_fn():
            collected = {}
            for key, url in urls.items():
                if (url or "").strip() == "":
                    collected[key] = ""
                else:
                    try:
                        content = gl.nondet.web.render(url, mode="text")
                        collected[key] = str(content)[:6000]
                    except Exception as e:
                        collected[key] = f"UNAVAILABLE: {str(e)}"

            task = (
                "You are a Web3 airdrop due diligence analyst. "
                "Use cautious language: potential, risk, signal, evidence, unclear, unverified, likely, not guaranteed. "
                "Do not guarantee any airdrop.\n\n"
                f"Project name: {project_name}\n"
                f"Notes: {notes}\n\n"
                "Public evidence:\n"
                f"Website:\n{collected.get('website_url','')}\n\n"
                f"Docs:\n{collected.get('docs_url','')}\n\n"
                f"X/Twitter:\n{collected.get('x_url','')}\n\n"
                f"Quest:\n{collected.get('quest_url','')}\n\n"
                f"GitHub:\n{collected.get('github_url','')}\n\n"
                f"Funding:\n{collected.get('funding_url','')}\n\n"
                "Return JSON only with keys: "
                "overall_airdrop_score, time_worthiness, risk_level, reward_clarity_score, token_signal_score, "
                "project_quality_score, community_authenticity_score, backer_legitimacy_score, product_delivery_score, "
                "sybil_competition_risk, rule_change_risk, recommended_strategy, positive_signals, red_flags, evidence_summary, valid_until_days."
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

        reward_clarity = self._clamp_score(self._safe_int(parsed.get("reward_clarity_score", 50), 50))
        token_signal = self._clamp_score(self._safe_int(parsed.get("token_signal_score", 50), 50))
        project_quality = self._clamp_score(self._safe_int(parsed.get("project_quality_score", 50), 50))
        community_auth = self._clamp_score(self._safe_int(parsed.get("community_authenticity_score", 50), 50))
        backer_legit = self._clamp_score(self._safe_int(parsed.get("backer_legitimacy_score", 50), 50))
        product_delivery = self._clamp_score(self._safe_int(parsed.get("product_delivery_score", 50), 50))

        sybil_risk = self._to_level(parsed.get("sybil_competition_risk", "unknown"), "low,medium,high,unknown", "unknown")
        rule_risk = self._to_level(parsed.get("rule_change_risk", "unknown"), "low,medium,high,unknown", "unknown")
        risk_level = self._to_level(parsed.get("risk_level", "unknown"), "low,medium,high,unknown", "unknown")
        time_worthiness = self._to_level(parsed.get("time_worthiness", "medium"), "high,medium,low", "medium")

        sybil_risk_score = 80
        if sybil_risk == "medium":
            sybil_risk_score = 50
        elif sybil_risk == "high":
            sybil_risk_score = 20
        elif sybil_risk == "unknown":
            sybil_risk_score = 40

        weighted = int(
            (0.25 * project_quality)
            + (0.20 * token_signal)
            + (0.15 * backer_legit)
            + (0.15 * product_delivery)
            + (0.10 * community_auth)
            + (0.10 * reward_clarity)
            + (0.05 * sybil_risk_score)
        )
        overall = self._clamp_score(weighted)

        recommended_strategy = str(parsed.get("recommended_strategy", "Farm selectively, focus on real product usage, and avoid high-cost loops."))
        positive_signals = str(parsed.get("positive_signals", "Some public evidence exists, but signals may be incomplete."))
        red_flags = str(parsed.get("red_flags", "Reward mechanics and distribution terms may remain unclear."))
        evidence_summary = str(parsed.get("evidence_summary", "This assessment is evidence-based and not guaranteed."))

        payload = {
            "project_name": project_name,
            "overall_airdrop_score": overall,
            "time_worthiness": time_worthiness,
            "risk_level": risk_level,
            "reward_clarity_score": reward_clarity,
            "token_signal_score": token_signal,
            "project_quality_score": project_quality,
            "community_authenticity_score": community_auth,
            "backer_legitimacy_score": backer_legit,
            "product_delivery_score": product_delivery,
            "sybil_competition_risk": sybil_risk,
            "rule_change_risk": rule_risk,
            "recommended_strategy": recommended_strategy,
            "positive_signals": positive_signals,
            "red_flags": red_flags,
            "evidence_summary": evidence_summary,
            "valid_until_days": self._safe_int(parsed.get("valid_until_days", 30), 30),
        }

        audit_id = int(self.total_audits)
        key = u256(audit_id)

        self.audit_project_names[key] = project_name
        self.audit_scores[key] = u256(overall)
        self.audit_risk_levels[key] = risk_level
        self.audit_time_worthiness[key] = time_worthiness
        self.audit_summary[key] = evidence_summary
        self.audit_red_flags[key] = red_flags
        self.audit_positive_signals[key] = positive_signals
        self.audit_strategy[key] = recommended_strategy
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
