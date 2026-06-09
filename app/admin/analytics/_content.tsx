"use client";

import { startTransition, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { useAnalyticsDashboard } from "@/lib/swr";
import { AnalyticsMetricCards } from "@/components/admin/analytics-metric-cards";
import { AnalyticsTrafficChart } from "@/components/admin/analytics-traffic-chart";
import { AnalyticsTopPages } from "@/components/admin/analytics-top-pages";
import { AnalyticsTrafficSources } from "@/components/admin/analytics-traffic-sources";
import { AnalyticsPlatforms } from "@/components/admin/analytics-platforms";
import { AnalyticsGeoRoutes } from "@/components/admin/analytics-geo-routes";
import { AnalyticsActivityTrend } from "@/components/admin/analytics-activity-trend";
import { AnalyticsInteractionMix } from "@/components/admin/analytics-interaction-mix";
import { AnalyticsContentHealth } from "@/components/admin/analytics-content-health";
import { AnalyticsEventSurface } from "@/components/admin/analytics-event-surface";
import { AnalyticsTopStyles } from "@/components/admin/analytics-top-styles";
import { AnalyticsAuditLog } from "@/components/admin/analytics-audit-log";

type TimeRange = "24h" | "7d" | "30d" | "90d";

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const { data, error, isLoading, mutate } = useAnalyticsDashboard(timeRange);

  const isDashboardRefreshing = isLoading && Boolean(data);

  if (isLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="space-y-3 text-center">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted" />
          <p className="text-sm text-muted">正在加载分析数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 dark:bg-red-900/10">
        <p className="text-red-600 dark:text-red-400">{error.message}</p>
        <button
          onClick={() => mutate()}
          className="mt-3 rounded-md bg-foreground px-4 py-2 text-sm text-background"
        >
          重试
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/10 px-3 py-1 text-xs text-muted">
            <Activity className="h-3.5 w-3.5" />
            数据分析
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">数据面板</h2>
          <p className="max-w-2xl text-sm text-muted">
            流量、访客、内容健康度与管理操作一览。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["24h", "7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => startTransition(() => setTimeRange(range))}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                timeRange === range
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted hover:text-foreground"
              }`}
            >
              {range === "24h" ? "24 小时" : range === "7d" ? "7 天" : range === "30d" ? "30 天" : "90 天"}
            </button>
          ))}
          <button
            onClick={() => { void mutate(); }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm text-muted transition-colors hover:text-foreground"
            aria-label="刷新数据"
          >
            <RefreshCw className={`h-4 w-4 ${isDashboardRefreshing ? "animate-spin" : ""}`} />
            {isDashboardRefreshing ? "更新中..." : "刷新"}
          </button>
        </div>
      </div>

      <AnalyticsMetricCards data={data} />
      <AnalyticsTrafficChart data={data} />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <AnalyticsTopPages data={data} />
        <AnalyticsTrafficSources data={data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <AnalyticsActivityTrend data={data} />
        <AnalyticsInteractionMix data={data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <AnalyticsContentHealth data={data} timeRange={timeRange} />
        <AnalyticsEventSurface data={data} />
        <AnalyticsTopStyles data={data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsPlatforms data={data} />
        <AnalyticsGeoRoutes data={data} />
      </div>

      <AnalyticsAuditLog />
    </div>
  );
}
