"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import {
  DashboardSection,
  SectionHeader,
  MicroStat,
  formatDelta,
  renderTrendIcon,
} from "./analytics-shared";

export function AnalyticsTrafficChart({ data }: { data: DashboardData }) {
  const chartData = useMemo(
    () =>
      data.trafficSeries.map((point) => ({
        label: point.label,
        pageViews: point.pageViews,
        visitors: point.visitors,
      })),
    [data.trafficSeries]
  );

  const trafficMax = useMemo(
    () => Math.max(...data.trafficSeries.map((p) => p.pageViews), 0),
    [data.trafficSeries]
  );

  return (
    <DashboardSection>
      <SectionHeader
        title="流量概览"
        subtitle="所选时间窗口内的浏览量与访客趋势。"
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

      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="fillPageViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.2 230)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.65 0.2 230)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/40"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              className="fill-muted"
              interval={chartData.length > 14 ? Math.ceil(chartData.length / 7) - 1 : 0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              className="fill-muted"
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl border border-border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
                    <p className="font-medium text-foreground">{label}</p>
                    <div className="mt-1 space-y-0.5">
                      {payload.map((entry) => (
                        <div key={entry.dataKey as string} className="flex items-center gap-2 text-muted">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span>
                            {entry.dataKey === "pageViews" ? "浏览量" : "访客"}:{" "}
                            <span className="font-medium text-foreground">
                              {(entry.value as number).toLocaleString()}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="pageViews"
              stroke="oklch(0.65 0.2 230)"
              strokeWidth={2.5}
              fill="url(#fillPageViews)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              stroke="oklch(0.72 0.19 155)"
              strokeWidth={2}
              fill="url(#fillVisitors)"
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center gap-5 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "oklch(0.65 0.2 230)" }} />
          浏览量
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "oklch(0.72 0.19 155)" }} />
          访客
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MicroStat label="峰值" value={trafficMax.toLocaleString()} detail="浏览量" />
        <MicroStat label="访客" value={data.visitors.toLocaleString()} detail="独立会话" />
        <MicroStat label="路径数" value={data.topPages.length.toLocaleString()} detail="热门页面" />
      </div>
    </DashboardSection>
  );
}
