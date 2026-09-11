import requests

from src.integrations.search import SearchCandidate


def analyze_presence(candidate: SearchCandidate, mock: bool) -> tuple[float, str, dict]:
    if not candidate.phone:
        return 0, "discarded_no_phone", {"phone": False, "reason": "Telefone não localizado"}
    if mock:
        if candidate.website:
            return 92, "discarded_site_real", {"website": candidate.website, "reachable": True, "quality": "strong"}
        return 24, "eligible", {"website": None, "maps_only": True, "social_profiles": []}
    if not candidate.website:
        return 30, "eligible", {"website": None, "maps_only": True}
    try:
        response = requests.get(candidate.website, timeout=12, allow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})
        text = response.text.lower()[:200000]
        signals = {
            "reachable": response.ok,
            "has_viewport": "name=\"viewport\"" in text or "name='viewport'" in text,
            "has_contact": any(word in text for word in ("whatsapp", "contato", "telefone")),
            "content_size": len(text),
        }
        score = 35 + (25 if response.ok else 0) + (20 if signals["has_viewport"] else 0) + (20 if signals["has_contact"] else 0)
        return score, ("discarded_site_real" if score >= 65 else "eligible"), {"website": candidate.website, **signals}
    except requests.RequestException as exc:
        return 35, "eligible", {"website": candidate.website, "reachable": False, "error": str(exc)}
