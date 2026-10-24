import type { Message, Operation, OperationCompany } from "./types.js";

type SendHistory = {
  operations: Pick<Operation, "id" | "organization_id" | "approval_mode">[];
  operationCompanies: Pick<OperationCompany, "id" | "operation_id">[];
  messages: Pick<Message, "organization_id" | "operation_company_id" | "status" | "sent_at">[];
};

export function automaticSendWaitMs(history: SendHistory, organizationId: string, seconds: number, at = Date.now()) {
  if (seconds <= 0) return 0;
  const operations = new Set(history.operations.filter(item => item.organization_id === organizationId && item.approval_mode === "automatic").map(item => item.id));
  const links = new Set(history.operationCompanies.filter(item => operations.has(item.operation_id)).map(item => item.id));
  let lastSent = 0;
  for (const message of history.messages) {
    if (message.organization_id !== organizationId || message.status !== "sent" || !message.sent_at || !links.has(message.operation_company_id)) continue;
    const timestamp = Date.parse(message.sent_at);
    if (Number.isFinite(timestamp)) lastSent = Math.max(lastSent, timestamp);
  }
  return lastSent ? Math.max(0, seconds * 1000 - (at - lastSent)) : 0;
}

export async function waitForAutomaticSendInterval(
  read: () => { history: SendHistory; organizationId: string; seconds: number },
  onWaiting: (remainingMs: number) => Promise<void>,
) {
  let announced = false;
  for (;;) {
    const current = read();
    const remaining = automaticSendWaitMs(current.history, current.organizationId, current.seconds);
    if (remaining <= 0) return;
    if (!announced) {
      await onWaiting(remaining);
      announced = true;
      continue;
    }
    // Reavaliar permite alterar o intervalo enquanto a operação está aguardando.
    await new Promise(resolve => setTimeout(resolve, Math.min(remaining, 1000)));
  }
}
