"use client";

import { useMemo } from "react";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import { DashboardSection, SectionHeader, formatCategoryLabel } from "./analytics-shared";

export function AnalyticsTopStyles({ data }: { data: DashboardData }) {
  const topStyleMax = useMemo(
    () => Math.max(...data.topStyles.map((s) => s.count), 0),
    [data.topStyles]
  );

  return (
    <DashboardSection>
      <SectionHeader
        title="热门样式"
        subtitle="所选时间段内浏览或交互最多的样式。"
        badge={`Top ${Math.min(data.topStyles.length, 8)}`}
      />
      <div className="mt-5 space-y-2.5">
        {data.topStyles.length === 0 ? (
          <p className="text-sm text-muted">暂无样式数据。</p>
        ) : (
          data.topStyles.slice(0, 8).map((style, index) => (
            <div key={style.slug} className="flex items-center gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/10 text-[11px] font-medium text-muted">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="truncate text-sm font-medium">{style.slug}</span>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                      {formatCategoryLabel(style.category ?? "uncategorized")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {style.count.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-foreground/70 to-foreground/25"
                    style={{ width: `${topStyleMax > 0 ? (style.count / topStyleMax) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardSection>
  );
}
