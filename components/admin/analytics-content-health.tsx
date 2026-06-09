"use client";

import { useMemo } from "react";
import { Bookmark, MessageSquare, ShieldCheck, Star } from "lucide-react";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import { DashboardSection, SectionHeader, PipelineCard } from "./analytics-shared";

function TrendRow({
  label,
  total,
  colorClass,
  points,
  max,
}: {
  label: string;
  total: number;
  colorClass: string;
  points: number[];
  max: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted">窗口内 {total.toLocaleString()} 条</p>
      </div>
      <div className="mt-2 flex h-10 items-end gap-0.5">
        {points.map((value, index) => {
          const height = max > 0 ? (value / max) * 100 : 0;
          return (
            <div key={`${label}-${index}`} className="flex h-full flex-1 items-end rounded-sm bg-muted/10">
              <div
                className={`w-full rounded-sm ${colorClass}`}
                style={{ height: `${Math.max(value > 0 ? height : 0, value > 0 ? 10 : 3)}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsContentHealth({
  data,
  timeRange,
}: {
  data: DashboardData;
  timeRange: string;
}) {
  const contentTrendMax = useMemo(
    () =>
      Math.max(
        ...data.contentTrends.flatMap((p) => [p.comments, p.ratings, p.favorites]),
        0
      ),
    [data.contentTrends]
  );

  const contentTrendTotals = useMemo(
    () =>
      data.contentTrends.reduce(
        (totals, point) => ({
          comments: totals.comments + point.comments,
          ratings: totals.ratings + point.ratings,
          favorites: totals.favorites + point.favorites,
        }),
        { comments: 0, ratings: 0, favorites: 0 }
      ),
    [data.contentTrends]
  );

  const rangeLabel = timeRange === "24h" ? "24 小时" : timeRange === "7d" ? "7 天" : timeRange === "30d" ? "30 天" : "90 天";

  const contentCards = [
    { icon: MessageSquare, label: "评论", value: data.contentSummary.comments.toLocaleString(), tone: "text-sky-500" },
    { icon: Star, label: "评分", value: data.contentSummary.ratings.toLocaleString(), tone: "text-amber-500" },
    { icon: Bookmark, label: "收藏", value: data.contentSummary.favorites.toLocaleString(), tone: "text-emerald-500" },
    { icon: ShieldCheck, label: "管理操作", value: data.contentSummary.adminActions.toLocaleString(), tone: "text-fuchsia-500" },
  ];

  return (
    <DashboardSection>
      <SectionHeader
        title="内容健康度"
        subtitle="衡量用户活跃度是否转化为社区深度的信号。"
        badge="审核 + 互动"
      />

      <div className="mt-5 grid grid-cols-2 gap-3">
        {contentCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-muted/5 p-4">
            <card.icon className={`h-4 w-4 ${card.tone}`} />
            <p className="mt-3 text-xl font-semibold">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-muted/5 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">投稿流水线</p>
          <p className="text-xs text-muted">共 {data.contentSummary.submissionsTotal.toLocaleString()} 条</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PipelineCard label="待审核" value={data.contentSummary.submissionsPending} tone="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300" />
          <PipelineCard label="已通过" value={data.contentSummary.submissionsApproved} tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" />
          <PipelineCard label="已拒绝" value={data.contentSummary.submissionsRejected} tone="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-muted/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">互动趋势</p>
            <p className="mt-1 text-xs text-muted">所选窗口内评论、评分与收藏的变化。</p>
          </div>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted">{rangeLabel}</span>
        </div>
        <div className="mt-4 space-y-4">
          <TrendRow label="评论" total={contentTrendTotals.comments} colorClass="bg-sky-500" points={data.contentTrends.map((p) => p.comments)} max={contentTrendMax} />
          <TrendRow label="评分" total={contentTrendTotals.ratings} colorClass="bg-amber-500" points={data.contentTrends.map((p) => p.ratings)} max={contentTrendMax} />
          <TrendRow label="收藏" total={contentTrendTotals.favorites} colorClass="bg-emerald-500" points={data.contentTrends.map((p) => p.favorites)} max={contentTrendMax} />
        </div>
      </div>
    </DashboardSection>
  );
}
