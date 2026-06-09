import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/admin-api", () => ({
  checkAdminApiAccess: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { GET } from "@/app/api/admin/styles/route";
import { checkAdminApiAccess } from "@/lib/auth/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const mockedCheckAdminApiAccess = vi.mocked(checkAdminApiAccess);
const mockedGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/styles", () => {
  it("counts favorites from session_id when user_id column is missing", async () => {
    mockedCheckAdminApiAccess.mockResolvedValue({
      allowed: true,
      actor: { type: "user", id: "admin" },
    });

    const sb = {
      from: vi.fn((tableName: string) => {
        if (tableName === "analytics_events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          };
        }

        if (tableName === "style_ratings" || tableName === "style_comments") {
          return {
            select: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          };
        }

        if (tableName === "user_favorites") {
          return {
            select: vi.fn((columns: string) => ({
              limit: vi.fn().mockResolvedValue(
                columns.includes("user_id")
                  ? {
                      data: null,
                      error: { code: "42703", message: "column user_id does not exist" },
                    }
                  : columns === "session_id, style_slug"
                    ? {
                        data: [
                          { session_id: "sess-1", style_slug: "neo-brutalist" },
                          { session_id: "sess-2", style_slug: "neo-brutalist" },
                          { session_id: "sess-1", style_slug: "neo-brutalist" },
                        ],
                        error: null,
                      }
                    : { data: [], error: null }
              ),
            })),
          };
        }

        if (tableName === "style_favorites") {
          return {
            select: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "42P01", message: "relation does not exist" },
              }),
            })),
          };
        }

        throw new Error(`Unexpected table: ${tableName}`);
      }),
    };

    mockedGetSupabaseAdmin.mockReturnValue(sb as never);

    const response = await GET(
      new Request("https://stylekit.top/api/admin/styles?sort=favorites&order=desc")
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    const styles = payload.styles as Array<{ slug: string; stats: { totalFavorites: number } }>;
    const target = styles.find((style) => style.slug === "neo-brutalist");

    expect(target).toBeDefined();
    expect(target?.stats.totalFavorites).toBe(2);
  });
});
