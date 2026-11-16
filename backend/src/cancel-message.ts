import { ApiError } from "./auth.js";
import type { Database } from "./types.js";

export function cancelPendingMessage(db: Database, messageId: string, actorId: string, eventId: string, timestamp: string) {
  const target = db.messages.find(item => item.id === messageId);
  const link = target && db.operationCompanies.find(item => item.id === target.operation_company_id);
  const operation = link && db.operations.find(item => item.id === link.operation_id);
  const company = link && db.companies.find(item => item.id === link.company_id);
  if (!target || !link || !operation || !company || operation.archived_at || company.archived_at)
    throw new ApiError(404, "Mensagem não encontrada");
  if (target.status !== "pending_approval")
    throw new ApiError(409, "Somente mensagens aguardando aprovação podem ser canceladas");
  target.status = "cancelled";
  target.updated_at = timestamp;
  link.status = "cancelled";
  link.discard_reason = "Envio cancelado por um usuário";
  link.updated_at = timestamp;
  operation.discarded_count++;
  const linkIds = new Set(db.operationCompanies.filter(item => item.operation_id === operation.id).map(item => item.id));
  const pending = db.messages.some(item => linkIds.has(item.operation_company_id) && item.status === "pending_approval");
  if (!pending && operation.status === "awaiting_approval") {
    operation.status = "completed";
    operation.current_stage = "Operação concluída";
    operation.finished_at = timestamp;
  }
  operation.updated_at = timestamp;
  db.events.push({id:eventId, organization_id:target.organization_id, operation_id:operation.id,
    operation_company_id:link.id, actor_id:actorId, event_type:"message_cancelled",
    payload:{message_id:messageId}, created_at:timestamp});
}
