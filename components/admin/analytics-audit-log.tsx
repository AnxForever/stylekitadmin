"use client";

import { useCallback, useMemo, useState } from "react";
import { useDeferredValue } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ShieldCheck,
} from "lucide-react";
import { useAdminAuditEvents } from "@/lib/swr";
import { DashboardSection, SummaryPill } from "./analytics-shared";

const AUDIT_PAGE_SIZE = 10;
type AuditActionFilter = "all" | "submission.approve" | "submission.reject";
type AuditTimeFilter = "24h" | "7d" | "30d" | "all";

function formatAuditAction(action: string): string {
  if (action === "submission.approve") return "投稿通过";
  if (action === "submission.reject") return "投稿拒绝";
  return action;
}

function formatAuditActionFilter(action: AuditActionFilter): string {
  if (action === "submission.approve") return "通过";
  if (action === "submission.reject") return "拒绝";
  return "全部操作";
}

function formatAuditActor(type: string, id: string): string {
  if (type === "user") return `用户:${id.slice(0, 8)}`;
  if (type === "token") return id;
  if (type === "dev-bypass") return "开发绕过";
  return `${type}:${id}`;
}

function getDownloadFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(contentDisposition);
  if (!match?.[1]) return fallback;
  const cleaned = decodeURIComponent(match[1].replace(/^"|"$/g, "").trim());
  return cleaned || fallback;
}

export function AnalyticsAuditLog() {
  const [actionFilter, setActionFilter] = useState<AuditActionFilter>("all");
  const [timeFilter, setTimeFilter] = useState<AuditTimeFilter>("7d");
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const days = useMemo<number | "all">(() => {
    if (timeFilter === "24h") return 1;
    if (timeFilter === "7d") return 7;
    if (timeFilter === "30d") return 30;
    return "all";
  }, [timeFilter]);

  const query = useMemo(
    () => ({
      limit: AUDIT_PAGE_SIZE,
      offset,
      action: actionFilter,
      days,
      search: deferredSearch,
    }),
    [actionFilter, days, offset, deferredSearch]
  );

  const { data, error, isLoading } = useAdminAuditEvents(query);

  const currentPage = useMemo(() => {
    const limit = data?.limit ?? AUDIT_PAGE_SIZE;
    const off = data?.offset ?? offset;
    return Math.floor(off / limit) + 1;
  }, [data?.limit, data?.offset, offset]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  const summary = useMemo(() => {
    const base = { approvals: 0, rejections: 0, uniqueActors: new Set<string>() };
    for (const event of data?.events ?? []) {
      if (event.action === "submission.approve") base.approvals += 1;
      if (event.action === "submission.reject") base.rejections += 1;
      base.uniqueActors.add(`${event.actor.type}:${event.actor.id}`);
    }
    return { approvals: base.approvals, rejections: base.rejections, uniqueActors: base.uniqueActors.size };
  }, [data?.events]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (days !== "all") params.set("days", String(days));
    if (search.trim().length > 0) params.set("search", search.trim());
    return `/api/admin/audit?${params.toString()}`;
  }, [actionFilter, days, search]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    setExportNotice(null);
    try {
      const response = await fetch(exportHref, { method: "GET" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "导出 CSV 失败。");
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const fileName = getDownloadFilename(response.headers.get("content-disposition"), "admin-audit.csv");
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      if (response.headers.get("x-export-truncated") === "true") {
        const limit = response.headers.get("x-export-limit");
        setExportNotice(
          limit
            ? `导出已达 ${limit} 行上限。请缩小筛选范围后重试。`
            : "导出被服务器截断。请缩小筛选范围后重试。"
        );
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "导出 CSV 失败。");
    } finally {
      setExporting(false);
    }
  }, [exportHref]);

  return (
    <DashboardSection>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">管理操作记录</h2>
          <p className="mt-1 text-sm text-muted">
            审核操作追踪，支持筛选、操作人可见性与 CSV 导出。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <SummaryPill label="显示" value={`${data?.events.length ?? 0}/${data?.total ?? 0}`} />
          <SummaryPill label="通过" value={summary.approvals.toString()} />
          <SummaryPill label="拒绝" value={summary.rejections.toString()} />
          <SummaryPill label="操作人" value={summary.uniqueActors.toString()} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "submission.approve", "submission.reject"] as const).map((action) => (
            <button
              key={action}
              onClick={() => { setActionFilter(action); setOffset(0); }}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                actionFilter === action
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {formatAuditActionFilter(action)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            {(["24h", "7d", "30d", "all"] as const).map((window) => (
              <button
                key={window}
                onClick={() => { setTimeFilter(window); setOffset(0); }}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  timeFilter === window
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {window === "24h" ? "24h" : window === "7d" ? "7d" : window === "30d" ? "30d" : "全部"}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            placeholder="搜索 slug、操作人、ID..."
            className="h-9 w-56 rounded-full border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => { void handleExport(); }}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "导出中..." : "导出 CSV"}
          </button>
        </div>
      </div>

      {exportNotice && !exportError && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">{exportNotice}</p>
      )}
      {exportError && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">{exportError}</p>
      )}

      {isLoading && <p className="mt-4 text-sm text-muted">正在加载审核日志...</p>}
      {!isLoading && error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error.message}</p>
      )}
      {!isLoading && !error && (data?.events.length ?? 0) === 0 && (
        <p className="mt-4 text-sm text-muted">暂无管理操作记录。</p>
      )}

      {!isLoading && !error && (data?.events.length ?? 0) > 0 && (
        <>
          <div className="mt-5 space-y-3">
            {(data?.events ?? []).map((event) => {
              const meta =
                event.metadata && typeof event.metadata === "object"
                  ? (event.metadata as Record<string, unknown>)
                  : null;
              const slug = typeof meta?.slug === "string" ? meta.slug : null;
              const noteProvided =
                typeof meta?.noteProvided === "boolean"
                  ? (meta.noteProvided ? "附带备注" : "无备注")
                  : null;

              return (
                <div key={event.id} className="rounded-2xl border border-border/70 bg-muted/5 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <ShieldCheck className="h-4 w-4 text-muted" />
                      {formatAuditAction(event.action)}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Clock3 className="h-3.5 w-3.5" />
                      {new Date(event.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                    <span>操作人: {formatAuditActor(event.actor.type, event.actor.id)}</span>
                    <span>目标: {event.targetType}{event.targetId ? ` (${event.targetId})` : ""}</span>
                    {slug && <span>Slug: {slug}</span>}
                    {noteProvided && <span>审核备注: {noteProvided}</span>}
                    {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between text-xs text-muted">
            <span>第 {currentPage} / {totalPages} 页</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, (data?.offset ?? 0) - (data?.limit ?? AUDIT_PAGE_SIZE)))}
                disabled={(data?.offset ?? 0) === 0}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> 上一页
              </button>
              <button
                onClick={() => { if (data?.nextOffset != null) setOffset(data.nextOffset); }}
                disabled={!data?.hasMore}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一页 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardSection>
  );
}
