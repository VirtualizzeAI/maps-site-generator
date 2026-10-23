const API_URL = (process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8000")
  .replace(/\/+$/, "");
export const TOKEN_KEY = "virtualizze_access_token";
export const REFRESH_TOKEN_KEY = "virtualizze_refresh_token";
let refreshPromise: Promise<{
  access_token: string;
  refresh_token: string;
}> | null = null;

export function getToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function saveSession(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  return request<T>(path, options, getToken() ?? accessToken, true);
}

async function request<T>(
  path: string,
  options: RequestInit,
  accessToken: string | undefined | null,
  allowRefresh: boolean,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (
    options.body != null &&
    !headers.has("Content-Type") &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (
    response.status === 401 &&
    allowRefresh &&
    !path.startsWith("/api/v1/auth/")
  ) {
    const refreshToken =
      typeof window === "undefined"
        ? null
        : localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        refreshPromise ??= refreshSession(refreshToken);
        const session = await refreshPromise;
        saveSession(session.access_token, session.refresh_token);
        return request<T>(path, options, session.access_token, false);
      } catch {
        expireSession();
      } finally {
        refreshPromise = null;
      }
    } else {
      expireSession();
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.detail ?? "Falha ao comunicar com a API",
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function expireSession() {
  clearToken();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

async function refreshSession(refreshToken: string) {
  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) throw new Error("Sessão expirada");
  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
  }>;
}
