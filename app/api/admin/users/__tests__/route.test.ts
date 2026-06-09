import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/admin-api", () => ({
  checkAdminApiAccess: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { GET } from "@/app/api/admin/users/route";
import { checkAdminApiAccess } from "@/lib/auth/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const mockedCheckAdminApiAccess = vi.mocked(checkAdminApiAccess);
const mockedGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

type QueryResult = { data: unknown[] | null; error: unknown };

interface MockOptions {
  authUsers?: unknown[];
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/users", () => {
  it("returns auth error when admin access is denied", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: false,
      status: 403,
      error: "Forbidden",
    });

    const response = await GET(new Request("https://stylekit.top/api/admin/users"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mockedGetSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("returns empty list when database is not configured", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "user", id: "admin" },
    });
    mockedGetSupabaseAdmin.mockReturnValue(null);

    const response = await GET(new Request("https://stylekit.top/api/admin/users?limit=10&offset=5"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      users: [],
      total: 0,
      limit: 10,
      offset: 5,
    });
  });

  it("aggregates both user_id and legacy session_id activity", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "token", id: "token" },
    });

    mockedGetSupabaseAdmin.mockReturnValue(
      createSupabaseMock({
        style_comments: {
          data: [
            {
              user_id: "user-1",
              session_id: null,
              author_name: "Alice",
              avatar_url: "https://img.test/alice.png",
              created_at: "2026-02-05T00:00:00.000Z",
            },
            {
              user_id: null,
              session_id: "sess-1",
              author_name: "Visitor",
              avatar_url: null,
              created_at: "2026-02-06T00:00:00.000Z",
            },
          ],
          error: null,
        },
        style_ratings: {
          data: [
            { user_id: "user-1", session_id: null, created_at: "2026-02-07T00:00:00.000Z" },
            { user_id: null, session_id: "sess-1", created_at: "2026-02-02T00:00:00.000Z" },
          ],
          error: null,
        },
        style_favorites: {
          data: [{ user_id: null, session_id: "sess-1", created_at: "2026-02-03T00:00:00.000Z" }],
          error: null,
        },
        style_submissions: {
          data: [{ user_id: "user-1", created_at: "2026-02-08T00:00:00.000Z" }],
          error: null,
        },
      }) as never
    );

    const response = await GET(new Request("https://stylekit.top/api/admin/users"));

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.total).toBe(2);
    expect(payload.users).toEqual([
      {
        userId: "user-1",
        identityType: "user",
        sequenceId: null,
        authorName: "Alice",
        avatarUrl: "https://img.test/alice.png",
        commentCount: 1,
        ratingCount: 1,
        favoriteCount: 0,
        submissionCount: 1,
        lastActive: "2026-02-08T00:00:00.000Z",
      },
      {
        userId: "session:sess-1",
        identityType: "session",
        sequenceId: null,
        authorName: "Visitor",
        avatarUrl: null,
        commentCount: 1,
        ratingCount: 1,
        favoriteCount: 1,
        submissionCount: 0,
        lastActive: "2026-02-06T00:00:00.000Z",
      },
    ]);
  });

  it("keeps endpoint available when one table query rejects", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "user", id: "admin" },
    });

    mockedGetSupabaseAdmin.mockReturnValue(
      createSupabaseMock({
        style_comments: {
          data: [
            {
              user_id: "user-1",
              session_id: null,
              author_name: "Alice",
              avatar_url: null,
              created_at: "2026-02-01T00:00:00.000Z",
            },
          ],
          error: null,
        },
        style_ratings: new Error("temporary query failure"),
        style_favorites: { data: [], error: null },
        style_submissions: { data: [], error: null },
      }) as never
    );

    const response = await GET(new Request("https://stylekit.top/api/admin/users?search=alice"));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.total).toBe(1);
    expect(payload.users[0].userId).toBe("user-1");
    expect(payload.users[0].ratingCount).toBe(0);
  });

  it("includes registered users from user_seq_ids without activity", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "user", id: "admin" },
    });

    mockedGetSupabaseAdmin.mockReturnValue(
      createSupabaseMock({
        style_comments: { data: [], error: null },
        style_ratings: { data: [], error: null },
        style_favorites: { data: [], error: null },
        style_submissions: { data: [], error: null },
        user_seq_ids: {
          data: [
            {
              user_id: "registered-user-1",
              seq_id: 42,
              created_at: "2026-02-10T00:00:00.000Z",
            },
          ],
          error: null,
        },
      }) as never
    );

    const response = await GET(new Request("https://stylekit.top/api/admin/users"));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.total).toBe(1);
    expect(payload.users).toEqual([
      {
        userId: "registered-user-1",
        identityType: "user",
        sequenceId: 42,
        authorName: "",
        avatarUrl: null,
        commentCount: 0,
        ratingCount: 0,
        favoriteCount: 0,
        submissionCount: 0,
        lastActive: "2026-02-10T00:00:00.000Z",
      },
    ]);
  });

  it("includes auth users even when activity tables are empty", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "user", id: "admin" },
    });

    mockedGetSupabaseAdmin.mockReturnValue(
      createSupabaseMock(
        {
          style_comments: { data: [], error: null },
          style_ratings: { data: [], error: null },
          style_favorites: { data: [], error: null },
          style_submissions: { data: [], error: null },
          user_seq_ids: { data: [], error: null },
        },
        {
          authUsers: [
            {
              id: "auth-user-1",
              created_at: "2026-02-12T00:00:00.000Z",
              email: "neo@example.com",
              user_metadata: {
                full_name: "Neo",
                avatar_url: "https://img.test/neo.png",
                seq_id: "9",
              },
            },
          ],
        }
      ) as never
    );

    const response = await GET(new Request("https://stylekit.top/api/admin/users"));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.total).toBe(1);
    expect(payload.users).toEqual([
      {
        userId: "auth-user-1",
        identityType: "user",
        sequenceId: 9,
        authorName: "Neo",
        avatarUrl: "https://img.test/neo.png",
        commentCount: 0,
        ratingCount: 0,
        favoriteCount: 0,
        submissionCount: 0,
        lastActive: "2026-02-12T00:00:00.000Z",
      },
    ]);
  });

  it("maps legacy session-based favorites with user: prefix back to registered users", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "user", id: "admin" },
    });

    mockedGetSupabaseAdmin.mockReturnValue(
      createSupabaseMock(
        {
          style_comments: { data: [], error: null },
          style_ratings: { data: [], error: null },
          style_favorites: {
            data: [
              {
                user_id: null,
                session_id: "user:auth-user-legacy",
                style_slug: "neo-brutalist",
                created_at: "2026-02-13T00:00:00.000Z",
              },
            ],
            error: null,
          },
          style_submissions: { data: [], error: null },
          user_seq_ids: { data: [], error: null },
        },
        {
          authUsers: [
            {
              id: "auth-user-legacy",
              created_at: "2026-02-10T00:00:00.000Z",
              email: "legacy@example.com",
              user_metadata: {},
            },
          ],
        }
      ) as never
    );

    const response = await GET(new Request("https://stylekit.top/api/admin/users"));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.total).toBe(1);
    expect(payload.users).toEqual([
      {
        userId: "auth-user-legacy",
        identityType: "user",
        sequenceId: null,
        authorName: "legacy",
        avatarUrl: null,
        commentCount: 0,
        ratingCount: 0,
        favoriteCount: 1,
        submissionCount: 0,
        lastActive: "2026-02-13T00:00:00.000Z",
      },
    ]);
  });

  it("falls back to session-only favorite columns when user_id column is missing", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "user", id: "admin" },
    });

    const sb = {
      from: vi.fn((tableName: string) => ({
        select: vi.fn((columns: string) => {
          if (tableName === "style_comments" || tableName === "style_ratings") {
            return Promise.resolve({ data: [], error: null });
          }

          if (tableName === "style_submissions" || tableName === "submissions") {
            return Promise.resolve({ data: [], error: null });
          }

          if (tableName === "user_seq_ids") {
            return Promise.resolve({ data: [], error: null });
          }

          if (tableName === "user_favorites") {
            if (columns.includes("user_id")) {
              return Promise.resolve({
                data: null,
                error: { code: "42703", message: "column user_id does not exist" },
              });
            }

            if (columns === "session_id, style_slug, created_at") {
              return Promise.resolve({
                data: [
                  {
                    session_id: "user:auth-user-legacy",
                    style_slug: "neo-brutalist",
                    created_at: "2026-02-14T00:00:00.000Z",
                  },
                ],
                error: null,
              });
            }
          }

          return Promise.resolve({
            data: null,
            error: { code: "42P01", message: "relation does not exist" },
          });
        }),
      })),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                {
                  id: "auth-user-legacy",
                  created_at: "2026-02-10T00:00:00.000Z",
                  email: "legacy@example.com",
                  user_metadata: {},
                },
              ],
            },
            error: null,
          }),
        },
      },
    };

    mockedGetSupabaseAdmin.mockReturnValue(sb as never);

    const response = await GET(new Request("https://stylekit.top/api/admin/users"));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.total).toBe(1);
    expect(payload.users[0].userId).toBe("auth-user-legacy");
    expect(payload.users[0].favoriteCount).toBe(1);
  });
});

function createSupabaseMock(
  responses: Record<string, QueryResult | Error>,
  options: MockOptions = {}
) {
  const allAuthUsers = options.authUsers ?? [];
  const listUsers = vi.fn(({ page, perPage }: { page: number; perPage: number }) => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return Promise.resolve({
      data: { users: allAuthUsers.slice(start, end) },
      error: null,
    });
  });

  return {
    from: vi.fn((tableName: string) => ({
      select: vi.fn().mockImplementation(() => {
        const result = responses[tableName];
        if (!result) {
          return Promise.resolve({ data: [], error: null });
        }
        if (result instanceof Error) {
          return Promise.reject(result);
        }
        return Promise.resolve(result);
      }),
    })),
    auth: {
      admin: {
        listUsers,
      },
    },
  };
}
