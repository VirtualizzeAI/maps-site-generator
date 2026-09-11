from uuid import UUID

from supabase import Client

from src.schemas.operations import OperationCreate


class OperationRepository:
    def __init__(self, client: Client):
        self.client = client

    def is_member(self, organization_id: UUID, user_id: UUID) -> bool:
        response = (
            self.client.table("organization_members")
            .select("user_id")
            .eq("organization_id", str(organization_id))
            .eq("user_id", str(user_id))
            .limit(1)
            .execute()
        )
        return bool(response.data)

    def create(self, payload: OperationCreate, user_id: UUID) -> dict:
        data = payload.model_dump(mode="json")
        data["created_by"] = str(user_id)
        data["status"] = "scheduled" if payload.scheduled_for else "searching"
        response = self.client.table("operations").insert(data).execute()
        return response.data[0]

    def list(self, organization_id: UUID) -> list[dict]:
        response = (
            self.client.table("operations")
            .select("*")
            .eq("organization_id", str(organization_id))
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
