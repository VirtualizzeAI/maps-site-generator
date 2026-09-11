import json
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.core.config import get_settings
from src.integrations.analysis import analyze_presence
from src.integrations.deployment import deploy_site
from src.integrations.search import SearchCandidate, search_companies
from src.integrations.site_generation import generate_site
from src.integrations.whatsapp import send_whatsapp
from src.models.entities import (
    Company, DigitalAnalysis, Event, GeneratedSite, IntegrationSettings, Message,
    Operation, OperationCompany,
)
from src.repositories.companies import CompanyRepository
from src.services.deduplication import CompanyCandidate


def add_event(session: Session, operation_id: str, kind: str, payload: dict | None = None, operation_company_id: str | None = None) -> None:
    session.add(Event(operation_id=operation_id, operation_company_id=operation_company_id, event_type=kind, payload=json.dumps(payload or {}, ensure_ascii=False)))


def integrations_for(session: Session, organization_id: str) -> IntegrationSettings:
    record = session.scalar(select(IntegrationSettings).where(IntegrationSettings.organization_id == organization_id))
    if record is None:
        record = IntegrationSettings(organization_id=organization_id)
        session.add(record)
        session.flush()
    return record


def render_message(template: str, company: Company, site_url: str) -> str:
    return (template.replace("{{empresa}}", company.name)
            .replace("{{nome_empresa}}", company.name)
            .replace("{{cidade}}", company.city or "")
            .replace("{{segmento}}", company.category or "")
            .replace("{{link}}", site_url)
            .replace("{{site_url}}", site_url))


def process_operation(session: Session, operation_id: str) -> None:
    settings = get_settings()
    operation = session.get(Operation, operation_id)
    if not operation or operation.status not in {"queued", "searching"}:
        return
    operation.status = "searching"
    operation.started_at = operation.started_at or datetime.now(UTC)
    add_event(session, operation.id, "operation_started")
    session.commit()
    integration = integrations_for(session, operation.organization_id)
    mock = settings.mock_mode
    try:
        candidates = search_companies(operation.niche, operation.city, operation.target_count, integration.serper_api_key or settings.serper_api_key, mock)
        operation.found_count = len(candidates)
        operation.status = "analyzing"
        add_event(session, operation.id, "search_completed", {"found": len(candidates)})
        session.commit()
        for candidate in candidates:
            _process_candidate(session, operation, candidate, integration, mock)
        pending = session.scalar(select(func.count(Message.id)).join(OperationCompany).where(
            OperationCompany.operation_id == operation.id, Message.status == "pending_approval"
        )) or 0
        operation.status = "awaiting_approval" if pending else "completed"
        operation.finished_at = None if pending else datetime.now(UTC)
        add_event(session, operation.id, "operation_finished", {"status": operation.status})
        session.commit()
    except Exception as exc:
        session.rollback()
        operation = session.get(Operation, operation_id)
        if operation:
            operation.status = "failed"
            operation.error_message = str(exc)
            operation.finished_at = datetime.now(UTC)
            add_event(session, operation.id, "operation_failed", {"error": str(exc)})
            session.commit()


def _process_candidate(session: Session, operation: Operation, candidate: SearchCandidate, integration: IntegrationSettings, mock: bool) -> None:
    settings = get_settings()
    company_repo = CompanyRepository(session)
    identity = CompanyCandidate(name=candidate.name, phone=candidate.phone or "", website=candidate.website or "", source_id=candidate.source_id or "", address=candidate.address or "")
    company, _ = company_repo.resolve(operation.organization_id, identity, candidate.raw())
    link = OperationCompany(organization_id=operation.organization_id, operation_id=operation.id, company_id=company.id, status="found")
    session.add(link)
    try:
        session.flush()
    except Exception:
        session.rollback()
        return
    if company.prospected_at or not company_repo.claim(company.id, operation.id):
        link.status = "blocked_history"
        link.discard_reason = "Empresa já prospectada em uma operação anterior"
        operation.blocked_count += 1
        add_event(session, operation.id, "company_blocked", {"company": company.name}, link.id)
        session.commit()
        return
    try:
        score, decision, evidence = analyze_presence(candidate, mock)
        session.add(DigitalAnalysis(operation_company_id=link.id, result=json.dumps(evidence, ensure_ascii=False), score=score, decision=decision))
        operation.analyzed_count += 1
        link.score = score
        if decision != "eligible":
            link.status = decision
            link.discard_reason = evidence.get("reason") or "Empresa já possui presença digital suficiente"
            operation.discarded_count += 1
            add_event(session, operation.id, "company_discarded", {"company": company.name, "reason": link.discard_reason}, link.id)
            session.commit()
            return
        link.status = "generating"
        session.commit()
        site_html = generate_site(candidate, integration.openai_api_key or settings.openai_api_key, integration.openai_model or settings.openai_model, mock)
        path, url, deployment_id = deploy_site(site_html, company.name, link.id, settings.generated_sites_dir, settings.public_api_url, integration.vercel_token or settings.vercel_token, mock)
        session.add(GeneratedSite(operation_company_id=link.id, slug=url.rstrip("/").split("/")[-1], html_path=path, public_url=url, deployment_id=deployment_id, status="deployed"))
        link.generated_site_url = url
        operation.generated_count += 1
        content = render_message(operation.message_template, company, url)
        link.final_message = content
        message = Message(operation_company_id=link.id, recipient=company.phone or "", content=content, status="pending_approval" if operation.approval_mode == "human_review" else "sending")
        session.add(message)
        session.flush()
        if operation.approval_mode == "human_review":
            link.status = "awaiting_approval"
        else:
            provider_id = send_whatsapp(message.recipient, content, integration.evolution_url or settings.evolution_url, integration.evolution_api_key or settings.evolution_api_key, integration.evolution_instance or settings.evolution_instance, mock)
            now = datetime.now(UTC)
            message.status, message.provider_message_id, message.sent_at = "sent", provider_id, now
            link.status, company.prospected_at, company.prospected_operation_id = "sent", now, operation.id
            operation.sent_count += 1
        add_event(session, operation.id, "company_processed", {"company": company.name, "status": link.status}, link.id)
        session.commit()
    except Exception as exc:
        session.rollback()
        link = session.get(OperationCompany, link.id)
        operation = session.get(Operation, operation.id)
        if link and operation:
            link.status = "failed"
            link.discard_reason = str(exc)
            add_event(session, operation.id, "company_failed", {"error": str(exc)}, link.id)
            session.commit()
