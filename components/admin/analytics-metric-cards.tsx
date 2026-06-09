"use client";

import { useMemo } from "react";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import { MetricCard, renderTrendBadge } from "./analytics-shared";

export function AnalyticsMetricCards({ data }: { data: DashboardData }) {
  const todayBucket = data.trafficSeries.at(-1);

  const todayViews = todayBucket?.pageViews ?? 0;
  const todayVisitors = todayBucket?.visitors ?? 0;

  const yesterdayBucket = data.trafficSeries.at(-2);
  const yesterdayViews = yesterdayBucket?.pageViews ?? 0;
  const yesterdayVisitors = yesterdayBucket?.visitors ?? 0;

  const viewsVsYesterday = useMemo(() => {
    if (yesterdayViews === 0) return todayViews > 0 ? "+100%" : null;
    const pct = ((todayViews - yesterdayViews) / yesterdayViews) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  }, [todayViews, yesterdayViews]);

  const visitorsVsYesterday = useMemo(() => {
    if (yesterdayVisitors === 0) return todayVisitors > 0 ? "+100%" : null;
    const pct = ((todayVisitors - yesterdayVisitors) / yesterdayVisitors) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  }, [todayVisitors, yesterdayVisitors]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="浏览量"
        value={data.pageViews.toLocaleString()}
        detail={`今日 ${todayViews.toLocaleString()} 次${viewsVsYesterday ? `（较昨日 ${viewsVsYesterday}）` : ""}`}
        badge={renderTrendBadge(data.trend.deltaPct)}
      />
      <MetricCard
        label="访客数"
        value={data.visitors.toLocaleString()}
        detail={`今日 ${todayVisitors.toLocaleString()} 位${visitorsVsYesterday ? `（较昨日 ${visitorsVsYesterday}）` : ""}`}
      />
      <MetricCard
        label="事件总量"
        value={data.totalEvents.toLocaleString()}
        detail={`日均 ${data.avgEventsPerDay.toLocaleString()} 次`}
      />
      <MetricCard
        label="跳出率"
        value={data.bounceRate == null ? "N/A" : `${data.bounceRate.toFixed(1)}%`}
        detail={`${data.uniqueSessions.toLocaleString()} 个活跃会话`}
      />
    </div>
  );
}
