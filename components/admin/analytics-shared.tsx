"use client";

import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";

/* ---------- Metric card (Vercel-style) ---------- */

export function MetricCard({
  label,
  value,
  detail,
  badge,
}: {
  label: string;
  value: string;
  detail?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        {badge}
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-2 text-xs text-muted">{detail}</p>}
    </div>
  );
}

/* ---------- Micro stat ---------- */

export function MicroStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

/* ---------- Leaderboard row ---------- */

export function LeaderboardRow({
  label,
  value,
  maxValue,
  barClass = "bg-foreground/65",
}: {
  label: string;
  value: number;
  maxValue: number;
  barClass?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="truncate">{label}</span>
        <span className="font-semibold tabular-nums">{value.toLocaleString()}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/20">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- Pipeline card ---------- */

export function PipelineCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <p className="text-xs uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

/* ---------- Summary pill ---------- */

export function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-border bg-muted/10 px-3 py-1 text-xs">
      {label}: {value}
    </span>
  );
}

/* ---------- Section wrapper ---------- */

export function DashboardSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-background p-6 ${className}`}>
      {children}
    </section>
  );
}

/* ---------- Section header ---------- */

export function SectionHeader({
  title,
  subtitle,
  badge,
  right,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {badge && (
        <span className="rounded-full border border-border bg-muted/10 px-3 py-1 text-xs text-muted">
          {badge}
        </span>
      )}
      {right}
    </div>
  );
}

/* ---------- Trend formatting ---------- */

export function formatDelta(deltaPct: number | null): string {
  if (deltaPct == null) return "无基准";
  if (deltaPct === 0) return "持平";
  return `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`;
}

export function renderTrendBadge(deltaPct: number | null) {
  const className =
    deltaPct == null
      ? "border-border bg-muted/10 text-muted"
      : deltaPct > 0
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        : deltaPct < 0
          ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300"
          : "border-border bg-muted/10 text-muted";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {renderTrendIcon(deltaPct)}
      {formatDelta(deltaPct)}
    </span>
  );
}

export function renderTrendIcon(deltaPct: number | null) {
  if (deltaPct == null) return <Minus className="h-3 w-3 text-muted" />;
  if (deltaPct > 0) return <ArrowUpRight className="h-3 w-3 text-emerald-500" />;
  if (deltaPct < 0) return <ArrowDownRight className="h-3 w-3 text-rose-500" />;
  return <Minus className="h-3 w-3 text-muted" />;
}

/* ---------- Formatting helpers ---------- */

export function formatDayLabel(date: string): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

export function formatPeakDay(peakDay: { date: string | null; count: number }): string {
  if (!peakDay.date) return "暂无活动";
  return `${formatDayLabel(peakDay.date)} (${peakDay.count.toLocaleString()})`;
}

export function formatCategoryLabel(category: string): string {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatEventType(type: string): string {
  const typeMap: Record<string, string> = {
    page_view: "页面浏览",
    style_view: "样式浏览",
    style_export: "样式导出",
    code_copy: "代码复制",
    animation_view: "动画浏览",
    template_view: "模板浏览",
    search: "搜索",
    cta_click: "CTA 点击",
    github_click: "GitHub 点击",
    newsletter_subscribe: "订阅",
  };
  if (typeMap[type]) return typeMap[type];
  return type
    .replace(/^admin_/, "管理 ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
