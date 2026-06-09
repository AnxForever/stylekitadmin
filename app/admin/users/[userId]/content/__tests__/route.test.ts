import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/admin-api", () => ({
  checkAdminApiAccess: vi.fn(),
}));

vi.mock("@/lib/admin/audit-log", () => ({
  recordAdminAuditEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { DELETE } from "@/app/api/admin/users/[userId]/content/route";
import { checkAdminApiAccess } from "@/lib/auth/admin-api";
import { recordAdminAuditEvent } from "@/lib/admin/audit-log";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const mockedCheckAdminApiAccess = vi.mocked(checkAdminApiAccess);
const mockedRecordAdminAuditEvent = vi.mocked(recordAdminAuditEvent);
const mockedGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

afterEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/admin/users/[userId]/content", () => {
  it("returns auth error when admin access is denied", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: false,
      status: 403,
      error: "Forbidden",
    });

    const response = await DELETE(
      new Request("https://stylekit.top/api/admin/users/user-1/content", {
        method: "DELETE",
        body: JSON.stringify({ types: ["comments"] }),
      }),
      { params: Promise.resolve({ userId: "user-1" }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("validates user identity payload for session records", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "user", id: "admin" },
    });

    const response = await DELETE(
      new Request("https://stylekit.top/api/admin/users/session:/content", {
        method: "DELETE",
        body: JSON.stringify({ types: ["comments"] }),
      }),
      { params: Promise.resolve({ userId: "session:" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid user identifier.",
    });
  });

  it("deletes by user_id for signed-in user records", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "token", id: "token" },
    });

    const chains = createDeleteChains({
      style_comments: 2,
      style_ratings: 1,
    });
    mockedGetSupabaseAdmin.mockReturnValue({ from: chains.from } as never);

    const response = await DELETE(
      new Request("https://stylekit.top/api/admin/users/user-1/content", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types: ["comments", "ratings"] }),
      }),
      { params: Promise.resolve({ userId: "user-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deleted: true,
      types: ["comments", "ratings"],
      deletedCounts: {
        comments: 2,
        ratings: 1,
      },
    });

    expect(chains.eqByTable.style_comments).toHaveBeenCalledWith("user_id", "user-1");
    expect(chains.eqByTable.style_ratings).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockedRecordAdminAuditEvent).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        action: "user.content.delete",
        targetId: "user-1",
        metadata: expect.objectContaining({ identityType: "user" }),
      })
    );
  });

  it("deletes by session_id for legacy anonymous records", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "user", id: "admin" },
    });

    const chains = createDeleteChains({
      style_comments: 3,
      style_ratings: 0,
    });
    mockedGetSupabaseAdmin.mockReturnValue({ from: chains.from } as never);

    const response = await DELETE(
      new Request("https://stylekit.top/api/admin/users/session:sess-9/content", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types: ["comments"] }),
      }),
      { params: Promise.resolve({ userId: "session:sess-9" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deleted: true,
      types: ["comments"],
      deletedCounts: {
        comments: 3,
      },
    });

    expect(chains.eqByTable.style_comments).toHaveBeenCalledWith("session_id", "sess-9");
    expect(mockedRecordAdminAuditEvent).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        targetId: "session:sess-9",
        metadata: expect.objectContaining({ identityType: "session" }),
      })
    );
  });
});

function createDeleteChains(countsByTable: Record<string, number>) {
  const eqByTable: Record<string, ReturnType<typeof vi.fn>> = {};

  const from = vi.fn((tableName: string) => {
    const eqMock = vi
      .fn()
      .mockResolvedValue({ count: countsByTable[tableName] ?? 0, error: null });
    eqByTable[tableName] = eqMock;

    return {
      delete: vi.fn().mockReturnValue({
        eq: eqMock,
      }),
    };
  });

  return { from, eqByTable };
}
