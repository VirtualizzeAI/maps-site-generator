from src.services.deduplication import (
    CompanyCandidate,
    build_identities,
    normalize_domain,
    normalize_phone,
    normalize_text,
)


def test_normalize_text_removes_accents_and_punctuation():
    assert normalize_text("  Clínica São João! ") == "clinica sao joao"


def test_normalize_brazilian_phone():
    assert normalize_phone("(84) 99999-1234") == "5584999991234"


def test_normalize_domain():
    assert normalize_domain("https://www.Exemplo.com.br/contato") == "exemplo.com.br"


def test_build_identities_uses_multiple_signals():
    identities = build_identities(
        CompanyCandidate(
            source_id="place-123",
            phone="(84) 99999-1234",
            website="https://empresa.com.br",
            name="Empresa São José",
            address="Rua Principal, 10",
        )
    )
    assert identities == {
        "google_place_id": "place-123",
        "phone": "5584999991234",
        "domain": "empresa.com.br",
        "name_address": "empresa sao jose|rua principal 10",
    }
