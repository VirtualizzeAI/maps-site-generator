import hashlib
from dataclasses import dataclass, asdict

import requests


@dataclass
class SearchCandidate:
    name: str
    phone: str | None
    address: str | None
    city: str
    category: str
    website: str | None = None
    source_id: str | None = None

    def raw(self) -> dict:
        return asdict(self)


def search_companies(niche: str, city: str, limit: int, api_key: str | None, mock: bool) -> list[SearchCandidate]:
    if mock:
        return _mock_candidates(niche, city, limit)
    if not api_key:
        raise RuntimeError("SERPER_API_KEY não configurada")
    response = requests.post(
        "https://google.serper.dev/maps",
        headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
        json={"q": f"{niche} em {city}", "gl": "br", "hl": "pt-br"},
        timeout=30,
    )
    response.raise_for_status()
    places = response.json().get("places", [])[:limit]
    return [
        SearchCandidate(
            name=p.get("title") or "Empresa sem nome",
            phone=p.get("phoneNumber") or p.get("phone"),
            address=p.get("address"),
            city=city,
            category=p.get("category") or niche,
            website=p.get("website"),
            source_id=str(p.get("cid") or p.get("placeId") or "") or None,
        )
        for p in places
    ]


def _mock_candidates(niche: str, city: str, limit: int) -> list[SearchCandidate]:
    seed = int(hashlib.sha256(f"{niche}:{city}".encode()).hexdigest()[:8], 16)
    streets = ["Av. Central", "Rua das Flores", "Rua do Comércio", "Av. Principal"]
    suffixes = ["Prime", "Essencial", "Imperial", "Studio", "Mais", "Center", "Ideal", "Premium"]
    result = []
    for index in range(limit):
        number = 100 + ((seed + index * 37) % 899)
        phone = None if index % 7 == 6 else f"55849{(seed + index * 7919) % 100000000:08d}"
        website = f"https://empresa-{index + 1}.example.com" if index % 5 == 4 else None
        result.append(SearchCandidate(
            name=f"{niche.title()} {suffixes[index % len(suffixes)]} {index + 1}",
            phone=phone,
            address=f"{streets[index % len(streets)]}, {number}",
            city=city,
            category=niche,
            website=website,
            source_id=f"mock-{seed}-{index}",
        ))
    return result
