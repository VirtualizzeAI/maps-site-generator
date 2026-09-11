import { apiRequest } from "@/services/api/client";
import type { CreateOperationInput, Operation } from "../types";

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
