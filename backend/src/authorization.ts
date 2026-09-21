import type { Membership, Role } from "./types.js";

export function authorizedMembership(
  items: Membership[],
  userId: string,
  organizationId: string,
  roles?: Role[],
) {
  const membership = items.find(
    (item) =>
      item.user_id === userId && item.organization_id === organizationId,
  );
  if (!membership) return null;
  if (roles && !roles.includes(membership.role)) return null;
  return membership;
}
