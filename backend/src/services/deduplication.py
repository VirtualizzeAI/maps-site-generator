import re
import unicodedata
from dataclasses import dataclass
from urllib.parse import urlparse


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.strip().lower())
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", without_accents).strip()


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) in {10, 11}:
        digits = f"55{digits}"
    return digits


def normalize_domain(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value if "://" in value else f"https://{value}")
    return parsed.netloc.lower().removeprefix("www.").split(":")[0]


@dataclass(frozen=True)
class CompanyCandidate:
    source_id: str = ""
    phone: str = ""
    website: str = ""
    name: str = ""
    address: str = ""


def build_identities(candidate: CompanyCandidate) -> dict[str, str]:
    identities: dict[str, str] = {}
    if candidate.source_id.strip():
        identities["google_place_id"] = candidate.source_id.strip()
    if phone := normalize_phone(candidate.phone):
        identities["phone"] = phone
    if domain := normalize_domain(candidate.website):
        identities["domain"] = domain
    if candidate.name and candidate.address:
        identities["name_address"] = (
            f"{normalize_text(candidate.name)}|{normalize_text(candidate.address)}"
        )
    return identities
