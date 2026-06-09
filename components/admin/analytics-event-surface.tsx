"use client";

import { useMemo } from "react";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import { DashboardSection, SectionHeader, formatEventType } from "./analytics-shared";

export function AnalyticsEventSurface({ data }: { data: DashboardData }) {
  const totalTypeEvents = useMemo(
    () => data.eventsByType.reduce((sum, e) => sum + e.count, 0),
    [data.eventsByType]
  );

  return (
    <DashboardSection>
      <SectionHeader
        title="事件分布"
        subtitle="当前时间段内各行为类型的占比。"
        badge={`${data.eventsByType.length} 种类型`}
      />
      <div className="mt-5 space-y-2.5">
        {data.eventsByType.length === 0 ? (
          <p className="text-sm text-muted">暂无事件记录。</p>
        ) : (
          data.eventsByType.map((event) => (
            <div key={event.type} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <p className="truncate text-sm">{formatEventType(event.type)}</p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">{event.count.toLocaleString()}</p>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/15">
                  <div
                    className="h-full rounded-full bg-foreground/60"
                    style={{ width: `${totalTypeEvents > 0 ? (event.count / totalTypeEvents) * 100 : 0}%` }}
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
