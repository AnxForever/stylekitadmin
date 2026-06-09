"use client";

import { Link2, MapPinned } from "lucide-react";
import type { DashboardData } from "@/lib/admin/analytics-dashboard";
import { DashboardSection, SectionHeader, LeaderboardRow } from "./analytics-shared";

export function AnalyticsGeoRoutes({ data }: { data: DashboardData }) {
  return (
    <DashboardSection>
      <SectionHeader
        title="地区与路由"
        subtitle="当上游代理发送地理位置 header 时将显示国家数据。"
        badge="Beta"
      />

      <div className="mt-5 rounded-2xl border border-border bg-muted/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPinned className="h-4 w-4 text-muted" />
          国家 / 地区
        </div>
        <div className="mt-3 space-y-3">
          {data.topCountries.length === 0 ? (
            <p className="text-sm text-muted">
              暂无国家数据。代理服务器发送地理位置 header 后将自动填充。
            </p>
          ) : (
            data.topCountries.map((country) => (
              <LeaderboardRow
                key={country.name}
                label={country.name}
                value={country.count}
                maxValue={data.topCountries[0]?.count ?? 0}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-muted/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Link2 className="h-4 w-4 text-muted" />
          路由健康
        </div>
        <div className="mt-3 space-y-2 text-sm text-muted">
          <p>{data.topPages.length.toLocaleString()} 个活跃路由</p>
          <p>{data.pageViews.toLocaleString()} 次页面浏览</p>
          <p>{data.visitors.toLocaleString()} 位访客</p>
        </div>
      </div>
    </DashboardSection>
  );
}
