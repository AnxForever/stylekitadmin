import { NextResponse } from "next/server";
import { checkAdminApiAccess } from "@/lib/auth/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { stylesMeta } from "@/lib/styles/meta";

const FAVORITES_TABLE_CANDIDATES = ["user_favorites", "style_favorites"] as const;

interface FavoriteRow {
  user_id?: string | null;
  session_id?: string | null;
  style_slug?: string | null;
}

export async function GET(request: Request) {
  const access = await checkAdminApiAccess(request);
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status ?? 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") ?? "name";
  const order = searchParams.get("order") ?? "desc";
  const search = searchParams.get("search");

  // Filter by category
  let filtered = [...stylesMeta];
  if (category) {
    filtered = filtered.filter((s) => s.category === category);
  }

  // Filter by search
  if (search && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.slug.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q)
    );
  }

  // Fetch dynamic stats from Supabase (if available)
  const sb = getSupabaseAdmin();

  const viewsMap = new Map<string, number>();
  const ratingsMap = new Map<string, { sum: number; count: number }>();
  const commentsMap = new Map<string, number>();
  const favoritesMap = new Map<string, number>();

  if (sb) {
    const [viewsRes, ratingsRes, commentsRes, favoriteRows] =
      await Promise.all([
        sb
          .from("analytics_events")
          .select("style_slug")
          .eq("event_type", "style_view")
          .limit(10000),
        sb.from("style_ratings").select("style_slug, rating").limit(10000),
        sb.from("style_comments").select("style_slug").limit(10000),
        fetchMergedFavoriteRows(sb),
      ]);

    // Group views by slug
    if (viewsRes.data) {
      for (const row of viewsRes.data) {
        const slug = row.style_slug as string;
        viewsMap.set(slug, (viewsMap.get(slug) ?? 0) + 1);
      }
    }

    // Group ratings by slug
    if (ratingsRes.data) {
      for (const row of ratingsRes.data) {
        const slug = row.style_slug as string;
        const rating = row.rating as number;
        const existing = ratingsMap.get(slug) ?? { sum: 0, count: 0 };
        existing.sum += rating;
        existing.count += 1;
        ratingsMap.set(slug, existing);
      }
    }

    // Group comments by slug
    if (commentsRes.data) {
      for (const row of commentsRes.data) {
        const slug = row.style_slug as string;
        commentsMap.set(slug, (commentsMap.get(slug) ?? 0) + 1);
      }
    }

    // Group favorites by slug (dedupe dual-table mirrors by identity+slug)
    const seenFavoriteKeys = new Set<string>();
    for (const row of favoriteRows) {
      const slug = typeof row.style_slug === "string" ? row.style_slug : null;
      if (!slug) continue;
      const identity = row.user_id ?? (row.session_id ? `session:${row.session_id}` : null);
      const dedupeKey = identity ? `${identity}::${slug}` : `anon::${slug}`;
      if (seenFavoriteKeys.has(dedupeKey)) {
        continue;
      }
      seenFavoriteKeys.add(dedupeKey);
      favoritesMap.set(slug, (favoritesMap.get(slug) ?? 0) + 1);
    }
  }

  // Merge static metadata with dynamic stats
  const styles = filtered.map((style) => {
    const ratingData = ratingsMap.get(style.slug);
    return {
      slug: style.slug,
      name: style.name,
      nameEn: style.nameEn,
      category: style.category,
      tags: style.tags,
      colors: style.colors,
      stats: {
        views: viewsMap.get(style.slug) ?? 0,
        avgRating:
          ratingData && ratingData.count > 0
            ? Math.round((ratingData.sum / ratingData.count) * 10) / 10
            : 0,
        totalRatings: ratingData?.count ?? 0,
        totalComments: commentsMap.get(style.slug) ?? 0,
        totalFavorites: favoritesMap.get(style.slug) ?? 0,
      },
    };
  });

  // Sort
  const sortMultiplier = order === "asc" ? 1 : -1;
  styles.sort((a, b) => {
    switch (sort) {
      case "views":
        return (a.stats.views - b.stats.views) * sortMultiplier;
      case "rating":
        return (a.stats.avgRating - b.stats.avgRating) * sortMultiplier;
      case "comments":
        return (a.stats.totalComments - b.stats.totalComments) * sortMultiplier;
      case "favorites":
        return (a.stats.totalFavorites - b.stats.totalFavorites) * sortMultiplier;
      case "name":
      default:
        return a.nameEn.localeCompare(b.nameEn) * sortMultiplier;
    }
  });

  return NextResponse.json({ styles });
}

async function fetchMergedFavoriteRows(
  sb: NonNullable<ReturnType<typeof getSupabaseAdmin>>
) {
  const rows: FavoriteRow[] = [];

  for (const tableName of FAVORITES_TABLE_CANDIDATES) {
    const result = await fetchRowsFromFavoritesTable(sb, tableName);
    if (result.error) {
      if (isMissingSchemaError(result.error as unknown)) {
        continue;
      }
      continue;
    }
    for (const row of result.data ?? []) {
      rows.push(row);
    }
  }

  return rows;
}

async function fetchRowsFromFavoritesTable(
  sb: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  tableName: string
): Promise<{ data: FavoriteRow[] | null; error: unknown | null }> {
  const selectVariants = [
    "user_id, session_id, style_slug",
    "user_id, style_slug",
    "session_id, style_slug",
    "style_slug",
  ];

  for (const columns of selectVariants) {
    const result = await sb.from(tableName).select(columns).limit(10000);
    if (!result.error) {
      return {
        data: Array.isArray(result.data) ? (result.data as FavoriteRow[]) : [],
        error: null,
      };
    }

    if (isMissingSchemaError(result.error)) {
      continue;
    }

    return { data: null, error: result.error as unknown };
  }

  return {
    data: null,
    error: { code: "42P01", message: `No usable schema for ${tableName}` },
  };
}

function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : null;
  if (code === "42P01" || code === "PGRST205" || code === "42703") {
    return true;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  return (
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("table") && message.includes("not found")) ||
    (message.includes("column") && message.includes("does not exist"))
  );
}
