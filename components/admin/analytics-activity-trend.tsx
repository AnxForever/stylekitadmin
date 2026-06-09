"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import {
  DashboardSection,
  SectionHeader,
  MicroStat,
  formatDelta,
  formatPeakDay,
  renderTrendIcon,
} from "./analytics-shared";

export function AnalyticsActivityTrend({ data }: { data: DashboardData }) {
  const windowLabel = data.trend.windowLabel
    .replace("vs previous 24 hours", "较前 24 小时")
    .replace("vs previous 7 days", "较前 7 天")
    .replace("vs previous 30 days", "较前 30 天")
    .replace("vs previous 90 days", "较前 90 天");

  const chartData = useMemo(
    () =>
      data.recentActivity.map((day) => ({
        date: day.date,
        label: new Date(day.date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
        count: day.count,
        isPeak: day.date === data.peakDay.date && day.count > 0,
      })),
    [data.recentActivity, data.peakDay.date]
  );

  return (
    <DashboardSection>
      <SectionHeader
        title="活动趋势"
        subtitle={`${windowLabel}。峰值日: ${formatPeakDay(data.peakDay)}`}
        right={
          <div className="rounded-2xl border border-border bg-muted/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">环比变化</p>
            <div className="mt-1 flex items-center justify-end gap-2">
              {renderTrendIcon(data.trend.deltaPct)}
              <span className="text-lg font-semibold">{formatDelta(data.trend.deltaPct)}</span>
            </div>
          </div>
        }
      />

      <div className="mt-6 h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              className="fill-muted"
              interval={chartData.length > 14 ? Math.ceil(chartData.length / 7) - 1 : 0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              className="fill-muted"
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload as (typeof chartData)[number] | undefined;
                if (!item) return null;
                return (
                  <div className="rounded-xl border border-border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-muted">
                      事件数: <span className="font-medium text-foreground">{item.count.toLocaleString()}</span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  className={entry.isPeak ? "fill-amber-400" : "fill-foreground/60"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MicroStat label="当前窗口" value={data.trend.currentTotal.toLocaleString()} detail="事件" />
        <MicroStat label="上一窗口" value={data.trend.previousTotal.toLocaleString()} detail="事件" />
        <MicroStat label="日均" value={data.avgEventsPerDay.toLocaleString()} detail="滚动均值" />
      </div>
    </DashboardSection>
  );
}
