"use client";

import { useMemo } from "react";
import { Activity, Copy, Download, Eye } from "lucide-react";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import {
  DashboardSection,
  SectionHeader,
  LeaderboardRow,
  formatCategoryLabel,
} from "./analytics-shared";

function ShareRow({
  label,
  value,
  total,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  icon: typeof Eye;
  tone: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-muted" />
          <span>{label}</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">{value.toLocaleString()}</p>
          <p className="text-[11px] text-muted">{percentage.toFixed(1)}%</p>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/20">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsInteractionMix({ data }: { data: DashboardData }) {
  const topCategoryMax = useMemo(
    () => Math.max(...data.topCategories.map((c) => c.count), 0),
    [data.topCategories]
  );

  return (
    <DashboardSection>
      <SectionHeader
        title="交互构成"
        subtitle="访客在浏览之外的行为分布。"
        badge={`共 ${data.totalEvents.toLocaleString()} 次`}
      />
      <div className="mt-5 space-y-4">
        <ShareRow label="样式浏览" value={data.activityBreakdown.views} total={data.totalEvents} icon={Eye} tone="bg-sky-500" />
        <ShareRow label="导出" value={data.activityBreakdown.exports} total={data.totalEvents} icon={Download} tone="bg-violet-500" />
        <ShareRow label="代码复制" value={data.activityBreakdown.copies} total={data.totalEvents} icon={Copy} tone="bg-emerald-500" />
        <ShareRow label="其他交互" value={data.activityBreakdown.interactions} total={data.totalEvents} icon={Activity} tone="bg-amber-500" />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-muted/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">分类热度</p>
        <div className="mt-3 space-y-3">
          {data.topCategories.length === 0 ? (
            <p className="text-sm text-muted">暂无分类活动。</p>
          ) : (
            data.topCategories.slice(0, 4).map((category) => (
              <LeaderboardRow
                key={category.category}
                label={formatCategoryLabel(category.category)}
                value={category.count}
                maxValue={topCategoryMax}
              />
            ))
          )}
        </div>
      </div>
    </DashboardSection>
  );
}
