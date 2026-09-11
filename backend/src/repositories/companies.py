import json

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.models.entities import Company, CompanyIdentity, ProspectingClaim
from src.services.deduplication import CompanyCandidate, build_identities, normalize_text


class CompanyRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_existing(self, organization_id: str, candidate: CompanyCandidate) -> Company | None:
        for identity_type, identity_value in build_identities(candidate).items():
            identity = self.session.scalar(
                select(CompanyIdentity).where(
                    CompanyIdentity.organization_id == organization_id,
                    CompanyIdentity.identity_type == identity_type,
                    CompanyIdentity.identity_value == identity_value,
                )
            )
            if identity:
                return self.session.get(Company, identity.company_id)
        return None

    def resolve(self, organization_id: str, candidate: CompanyCandidate, raw_data: dict) -> tuple[Company, bool]:
        existing = self.find_existing(organization_id, candidate)
        if existing:
            return existing, False

        company = Company(
            organization_id=organization_id,
            name=candidate.name,
            normalized_name=normalize_text(candidate.name),
            phone=candidate.phone or None,
            address=candidate.address or None,
            city=raw_data.get("city"),
            category=raw_data.get("category"),
            website=candidate.website or None,
            source_id=candidate.source_id or None,
            raw_data=json.dumps(raw_data, ensure_ascii=False),
        )
        self.session.add(company)
        self.session.flush()
        for identity_type, identity_value in build_identities(candidate).items():
            self.session.add(
                CompanyIdentity(
                    organization_id=organization_id,
                    company_id=company.id,
                    identity_type=identity_type,
                    identity_value=identity_value,
                )
            )
        try:
            self.session.commit()
            self.session.refresh(company)
            return company, True
        except IntegrityError:
            self.session.rollback()
            concurrent = self.find_existing(organization_id, candidate)
            if not concurrent:
                raise
            return concurrent, False

    def claim(self, company_id: str, operation_id: str) -> bool:
        current = self.session.get(ProspectingClaim, company_id)
        if current:
            return current.operation_id == operation_id
        self.session.add(ProspectingClaim(company_id=company_id, operation_id=operation_id))
        try:
            self.session.commit()
            return True
        except IntegrityError:
            self.session.rollback()
            current = self.session.get(ProspectingClaim, company_id)
            return bool(current and current.operation_id == operation_id)

    def list(self, organization_id: str, limit: int = 200) -> list[Company]:
        return list(
            self.session.scalars(
                select(Company)
                .where(Company.organization_id == organization_id)
                .order_by(Company.created_at.desc())
                .limit(limit)
            )
        )
