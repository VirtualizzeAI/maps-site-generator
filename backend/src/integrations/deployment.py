import json
import re
import unicodedata
from pathlib import Path

import requests


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")[:120] or "site"


def deploy_site(html: str, name: str, unique_id: str, sites_dir: Path, public_api_url: str, token: str | None, mock: bool) -> tuple[str, str, str | None]:
    slug = f"{slugify(name)}-{unique_id[:8]}"
    target = sites_dir / slug
    target.mkdir(parents=True, exist_ok=True)
    path = target / "index.html"
    path.write_text(html, encoding="utf-8")
    if mock:
        return str(path), f"{public_api_url.rstrip('/')}/generated/{slug}/", None
    if not token:
        raise RuntimeError("VERCEL_TOKEN não configurado")
    response = requests.post(
        "https://api.vercel.com/v13/deployments",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"name": slug, "files": [{"file": "index.html", "data": html}], "projectSettings": {"framework": None}},
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    return str(path), f"https://{data['url']}", data.get("id")
