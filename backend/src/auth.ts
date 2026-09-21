import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { authorizedMembership } from "./authorization.js";
import { authClient } from "./supabase.js";
import { store } from "./store.js";
import type { Membership, Role, User } from "./types.js";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export async function currentUser(request: FastifyRequest): Promise<User> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer "))
    throw new ApiError(401, "Token ausente");
  const { data, error } = await authClient().auth.getClaims(
    authorization.slice(7).trim(),
  );
  const userId = data?.claims.sub;
  if (error || !userId) throw new ApiError(401, "Sessão inválida ou expirada");
  let user = store
    .snapshot()
    .users.find((item) => item.id === userId && item.active);
  if (!user) {
    await store.reload();
    user = store
      .snapshot()
      .users.find((item) => item.id === userId && item.active);
  }
  if (!user) throw new ApiError(403, "Usuário inativo ou sem perfil");
  return user;
}

export function membership(
  userId: string,
  organizationId: string,
  roles?: Role[],
): Membership {
  const item = authorizedMembership(
    store.snapshot().memberships,
    userId,
    organizationId,
    roles,
  );
  if (!item) throw new ApiError(403, "Usuário sem acesso à organização");
  return item;
}

export function serializeUser(user: User) {
  const db = store.snapshot();
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    organizations: db.memberships
      .filter((item) => item.user_id === user.id)
      .map((item) => {
        const org = db.organizations.find(
          (org) => org.id === item.organization_id,
        );
        return org ? { id: org.id, name: org.name, role: item.role } : null;
      })
      .filter(Boolean),
  };
}

export const id = () => randomUUID();
export const now = () => new Date().toISOString();
