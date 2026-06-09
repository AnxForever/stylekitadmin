import { NextResponse } from "next/server";
import { checkAdminApiAccess } from "@/lib/auth/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const AUDIT_LOG_FILE = path.join(DATA_DIR, "admin-audit.json");

const TRACKED_TABLES = [
  { name: "analytics_events", candidates: ["analytics_events"] },
  { name: "style_comments", candidates: ["style_comments"] },
  { name: "style_ratings", candidates: ["style_ratings"] },
  { name: "style_favorites", candidates: ["user_favorites", "style_favorites"] },
  { name: "style_submissions", candidates: ["submissions", "style_submissions"] },
  { name: "user_seq_ids", candidates: ["user_seq_ids"] },
] as const;

export async function GET(request: Request) {
  const access = await checkAdminApiAccess(request);
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status ?? 403 }
    );
  }

  const [environment, database, runtime, audit] = await Promise.all([
    getEnvironmentInfo(),
    getDatabaseInfo(),
    getRuntimeInfo(),
    getAuditInfo(),
  ]);

  return NextResponse.json({ environment, database, runtime, audit });
}

function getEnvironmentInfo() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    vercelEnv: process.env.VERCEL_ENV ?? null,
    supabaseConfigured: !!(
      supabaseUrl &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    supabaseProjectRef: getSupabaseProjectRef(supabaseUrl),
    adminTokenConfigured: !!process.env.ADMIN_API_TOKEN,
    adminUserIdsConfigured: !!process.env.ADMIN_USER_IDS,
  };
}

async function getDatabaseInfo() {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return { connected: false, tables: [] };
  }

  const tableResults: Array<{ name: string; rowCount: number }> = await Promise.all(
    TRACKED_TABLES.map(async (tableConfig) => {
      const rowCount = await countTableRows(sb, tableConfig.candidates);
      return {
        name: tableConfig.name,
        rowCount,
      };
    })
  );

  tableResults.push({
    name: "auth_users",
    rowCount: await countAuthUsers(sb),
  });

  return { connected: true, tables: tableResults };
}

async function countTableRows(
  sb: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  tableCandidates: readonly string[]
): Promise<number> {
  for (const tableName of tableCandidates) {
    try {
      const { count, error } = await sb
        .from(tableName)
        .select("*", { count: "exact", head: true });

      if (!error) {
        return count ?? 0;
      }

      if (isMissingRelationError(error)) {
        continue;
      }

      return -1;
    } catch {
      return -1;
    }
  }

  return -1;
}

async function countAuthUsers(
  sb: NonNullable<ReturnType<typeof getSupabaseAdmin>>
): Promise<number> {
  const pageSize = 200;
  const maxPages = 20;
  let total = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    try {
      const { data, error } = await sb.auth.admin.listUsers({
        page,
        perPage: pageSize,
      });
      if (error) {
        return -1;
      }

      const users = Array.isArray(data?.users) ? data.users : [];
      total += users.length;

      if (users.length < pageSize) {
        break;
      }
    } catch {
      return -1;
    }
  }

  return total;
}

function getRuntimeInfo() {
  return {
    nodeVersion: process.version,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  };
}

async function getAuditInfo() {
  if (!existsSync(AUDIT_LOG_FILE)) {
    return { fileEventCount: 0 };
  }

  try {
    const raw = await readFile(AUDIT_LOG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const events = Array.isArray(parsed) ? parsed : [];
    return { fileEventCount: events.length };
  } catch {
    return { fileEventCount: 0 };
  }
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error && typeof error.code === "string"
      ? error.code
      : null;
  if (code === "42P01" || code === "PGRST205") {
    return true;
  }

  const message = readErrorMessage(error).toLowerCase();
  return (
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("table") && message.includes("not found"))
  );
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

function getSupabaseProjectRef(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname;
    const match = hostname.match(/^([a-zA-Z0-9-]+)\.supabase\./);
    if (!match) {
      return null;
    }
    return match[1] ?? null;
  } catch {
    return null;
  }
}
