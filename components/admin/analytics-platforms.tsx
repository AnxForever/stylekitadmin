"use client";

import { useMemo } from "react";
import { Globe2, Monitor, Smartphone } from "lucide-react";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import { DashboardSection, SectionHeader, LeaderboardRow } from "./analytics-shared";

function PlatformList({
  title,
  icon: Icon,
  items,
  max,
}: {
  title: string;
  icon: typeof Monitor;
  items: Array<{ name: string; count: number }>;
  max: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-muted" />
        {title}
      </div>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted">暂无数据。</p>
        ) : (
          items.map((item) => (
            <LeaderboardRow
              key={`${title}-${item.name}`}
              label={item.name}
              value={item.count}
              maxValue={max}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function AnalyticsPlatforms({ data }: { data: DashboardData }) {
  const platformMax = useMemo(
    () =>
      Math.max(
        ...data.topBrowsers.map((i) => i.count),
        ...data.topDevices.map((i) => i.count),
        ...data.topOperatingSystems.map((i) => i.count),
        0
      ),
    [data.topBrowsers, data.topDevices, data.topOperatingSystems]
  );

  return (
    <DashboardSection>
      <SectionHeader
        title="客户端分布"
        subtitle="浏览器、设备类型与操作系统。"
        badge="终端画像"
      />
      <div className="mt-5 space-y-5">
        <PlatformList title="浏览器" icon={Monitor} items={data.topBrowsers} max={platformMax} />
        <PlatformList title="设备" icon={Smartphone} items={data.topDevices} max={platformMax} />
        <PlatformList title="操作系统" icon={Globe2} items={data.topOperatingSystems} max={platformMax} />
      </div>
    </DashboardSection>
  );
}
