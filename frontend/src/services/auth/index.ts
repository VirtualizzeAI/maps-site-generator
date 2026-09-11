import { apiRequest, saveToken } from "@/services/api/client";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  organizations: { id: string; name: string; role: string }[];
}

export async function login(email: string, password: string) {
  const response = await apiRequest<{ access_token: string; user: CurrentUser }>("/api/v1/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  saveToken(response.access_token);
  return response.user;
}

export function me(token: string) {
  return apiRequest<CurrentUser>("/api/v1/auth/me", {}, token);
}
