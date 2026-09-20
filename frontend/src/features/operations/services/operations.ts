import { apiRequest } from "@/services/api/client";
import type { CreateOperationInput, Operation, OperationDetail } from "../types";

export function listOperations(accessToken: string, organizationId: string) {
  const query = new URLSearchParams({ organization_id: organizationId });
  return apiRequest<Operation[]>(`/api/v1/operations?${query}`, {}, accessToken);
}

export function createOperation(accessToken: string, input: CreateOperationInput) {
  return apiRequest<Operation>(
    "/api/v1/operations",
    { method: "POST", body: JSON.stringify(input) },
    accessToken,
  );
}

export function getOperation(accessToken: string, operationId: string) {
  return apiRequest<OperationDetail>(`/api/v1/operations/${operationId}`, {}, accessToken);
}

export function archiveOperation(accessToken: string, operationId: string) {
  return apiRequest<{ success: boolean }>(`/api/v1/operations/${operationId}`, { method: "DELETE" }, accessToken);
}
