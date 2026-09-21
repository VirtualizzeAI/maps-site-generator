import { describe, expect, it } from "vitest";
import { authorizedMembership } from "../src/authorization.js";
import type { Membership } from "../src/types.js";

const memberships: Membership[] = [
  {
    organization_id: "org-a",
    user_id: "admin-a",
    role: "admin",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    organization_id: "org-a",
    user_id: "viewer-a",
    role: "viewer",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    organization_id: "org-b",
    user_id: "admin-b",
    role: "admin",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

describe("authorizedMembership", () => {
  it("permite a função exigida dentro da própria organização", () => {
    expect(
      authorizedMembership(memberships, "admin-a", "org-a", ["admin"])?.role,
    ).toBe("admin");
  });

  it("nega acesso a outra organização", () => {
    expect(
      authorizedMembership(memberships, "admin-a", "org-b", ["admin"]),
    ).toBeNull();
  });

  it("nega ação administrativa para visualizador", () => {
    expect(
      authorizedMembership(memberships, "viewer-a", "org-a", ["admin"]),
    ).toBeNull();
  });
});
