"use client";

import { useMemo } from "react";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import { DashboardSection, SectionHeader } from "./analytics-shared";

const TYPE_LABELS: Record<string, string> = {
  direct: "直接访问",
  search: "搜索引擎",
  social: "社交媒体",
  internal: "站内跳转",
  external: "外部链接",
};

const TYPE_COLORS: Record<string, string> = {
  direct: "bg-sky-500/70",
  search: "bg-violet-500/70",
  social: "bg-rose-500/70",
  internal: "bg-muted/40",
  external: "bg-emerald-500/70",
};

export function AnalyticsTrafficSources({ data }: { data: DashboardData }) {
  const topReferrerMax = useMemo(
    () => Math.max(...data.topReferrers.map((s) => s.count), 0),
    [data.topReferrers]
  );

  return (
    <DashboardSection>
      <SectionHeader
        title="流量来源"
        subtitle="按来源类型分组的引荐流量。"
        badge={`${data.topReferrers.length} 个来源`}
      />
      <div className="mt-5 space-y-2.5">
        {data.topReferrers.length === 0 ? (
          <p className="text-sm text-muted">
            有新的页面访问记录后，流量来源数据将在此显示。
          </p>
        ) : (
          data.topReferrers.map((source) => (
            <div key={`${source.type}:${source.source}`} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{source.source}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                    {TYPE_LABELS[source.type] ?? "外部链接"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {source.count.toLocaleString()}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted/15">
                <div
                  className={`h-full rounded-full ${TYPE_COLORS[source.type] ?? "bg-foreground/50"}`}
                  style={{ width: `${topReferrerMax > 0 ? (source.count / topReferrerMax) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardSection>
  );
}
