from pydantic import BaseModel


class DashboardSummary(BaseModel):
    companies: int
    operations: int
    sites_generated: int
    messages_sent: int
    discarded: int
    blocked: int
    pending_approval: int
    running_operation_id: str | None
