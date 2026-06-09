"use client";

import { useMemo } from "react";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import { DashboardSection, SectionHeader } from "./analytics-shared";

export function AnalyticsTopPages({ data }: { data: DashboardData }) {
  const topPageMax = useMemo(
    () => Math.max(...data.topPages.map((p) => p.count), 0),
    [data.topPages]
  );

  return (
    <DashboardSection>
      <SectionHeader
        title="热门页面"
        subtitle="所选时间段内流量最高的路径。"
        badge="路由"
      />
      <div className="mt-5 space-y-2.5">
        {data.topPages.length === 0 ? (
          <p className="text-sm text-muted">暂无页面浏览数据。</p>
        ) : (
          data.topPages.map((page, index) => (
            <div key={page.path} className="flex items-center gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/10 text-[11px] font-medium text-muted">
                {index + 1}
              </span>
              <div className="relative min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm">{page.path}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {page.count.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/15">
                  <div
                    className="h-full rounded-full bg-sky-500/70"
                    style={{ width: `${topPageMax > 0 ? (page.count / topPageMax) * 100 : 0}%` }}
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
