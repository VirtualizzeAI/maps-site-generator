import hashlib
import re

import requests


def send_whatsapp(recipient: str, content: str, base_url: str | None, api_key: str | None, instance: str | None, mock: bool) -> str:
    phone = re.sub(r"\D", "", recipient)
    if mock:
        return "mock-" + hashlib.sha256(f"{phone}:{content}".encode()).hexdigest()[:16]
    if not all((base_url, api_key, instance)):
        raise RuntimeError("Evolution API não configurada")
    response = requests.post(
        f"{base_url.rstrip('/')}/message/sendText/{instance}",
        headers={"apikey": api_key, "Content-Type": "application/json"},
        json={"number": phone, "text": content},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    return str(data.get("key", {}).get("id") or data.get("id") or "sent")
