"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Feather,
  CalendarDays,
  Tag,
  FileText,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Stats {
  totalDiaries: number;
  totalWeeklies: number;
  totalTags: number;
  weekDiaryCount: number;
  activeDays: number;
}

interface WeekDayCount {
  date: string;
  count: number;
}

interface TopTag {
  id: string;
  name: string;
  count: number;
}

interface RecentDiary {
  id: string;
  title: string;
  date: string;
  tags: { id: string; name: string }[];
}

interface DashboardData {
  stats: Stats;
  weekDailyCount: WeekDayCount[];
  activityData: { date: string; count: number }[];
  topTags: TopTag[];
  monthCounts: number[];
  monthLabels: string[];
  totalDiariesInRange: number;
  isCurrentYear: boolean;
  recentDiaries: RecentDiary[];
}

// 热力图颜色等级
function getHeatColor(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 1) return "bg-emerald-100";
  if (count <= 2) return "bg-emerald-300";
  if (count <= 4) return "bg-emerald-400";
  return "bg-emerald-500";
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const diff = Math.floor(
    (today.getTime() - d.getTime()) / 86400000
  );
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff === 2) return "前天";
  const m = d.getMonth() + 1;
  const dy = d.getDate();
  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${m}月${dy}日 ${week[d.getDay()]}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/dashboard/stats?year=${year}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-sm">加载中...</p>
      </div>
    );
  }

  const { stats, weekDailyCount, activityData, topTags, recentDiaries } = data;

  // 热力图日期范围
  const now = new Date();
  const heatmapStart = data.isCurrentYear
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 365)
    : new Date(year, 0, 1);
  const heatmapEnd = data.isCurrentYear ? new Date() : new Date(year, 11, 31);

  // 构建热力图数据
  const buildHeatmap = () => {
    const activityMap = new Map<string, number>();
    for (const item of activityData) {
      activityMap.set(item.date, item.count);
    }

    // 对齐到周日（Gitee风格从周日开始）
    const firstDay = new Date(heatmapStart);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());

    const weeks: { date: Date; count: number }[][] = [];
    const monthLabels: { label: string; weekIndex: number }[] = [];
    let currentDate = new Date(firstDay);
    let weekIndex = 0;
    let lastMonth = -1;

    while (currentDate <= heatmapEnd || weeks.length === 0) {
      const week: { date: Date; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const m = currentDate.getMonth();
        if (d === 0 && m !== lastMonth) {
          monthLabels.push({ label: `${m + 1}月`, weekIndex });
          lastMonth = m;
        }
        week.push({
          date: new Date(currentDate),
          count: activityMap.get(toLocalDateStr(currentDate)) || 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
      weekIndex++;
      // 如果已经过了结束日期，且完成了本周，结束
      if (currentDate > heatmapEnd && currentDate.getDay() === 0) break;
      // 安全限制
      if (weeks.length > 60) break;
    }

    return { weeks, monthLabels };
  };

  const { weeks, monthLabels } = buildHeatmap();
  const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];

  // 本周数据
  const weekDays = ["一", "二", "三", "四", "五", "六", "日"];
  const maxWeekCount = Math.max(...weekDailyCount.map((d) => d.count), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground font-[family-name:var(--font-serif)]">
          仪表盘
        </h1>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">总日记数</span>
          </div>
          <p className="text-2xl font-bold font-[family-name:var(--font-serif)] text-foreground">
            {stats.totalDiaries}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-success" />
            </div>
            <span className="text-xs text-muted-foreground">本周记录</span>
          </div>
          <p className="text-2xl font-bold font-[family-name:var(--font-serif)] text-foreground">
            {stats.weekDiaryCount}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-chart-3" />
            </div>
            <span className="text-xs text-muted-foreground">周报数</span>
          </div>
          <p className="text-2xl font-bold font-[family-name:var(--font-serif)] text-foreground">
            {stats.totalWeeklies}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-chart-4/10 flex items-center justify-center">
              <Tag className="w-4 h-4 text-chart-4" />
            </div>
            <span className="text-xs text-muted-foreground">标签数</span>
          </div>
          <p className="text-2xl font-bold font-[family-name:var(--font-serif)] text-foreground">
            {stats.totalTags}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* 左侧 - 热力图 + 周活跃度 */}
        <div className="lg:col-span-2 space-y-5">
          {/* 年度活跃度热力图（Gitee 风格） */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[family-name:var(--font-serif)] font-bold text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                活跃度
              </h3>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-8 px-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <option key={y} value={y}>
                      {y} 年
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 描述 */}
            <p className="text-xs text-muted-foreground mb-3">
              {stats.totalDiaries > 0
                ? data.isCurrentYear
                  ? `最近一年共有 ${activityData.length} 天有记录，合计 ${data.totalDiariesInRange} 篇日记`
                  : `${year} 年共有 ${activityData.length} 天有记录，合计 ${data.totalDiariesInRange} 篇日记`
                : data.isCurrentYear
                ? `最近一年暂无记录`
                : `${year} 年暂无记录`}
            </p>

            {/* 热力图 — 百分比自适应，支持横向滑动 */}
            <div className="overflow-x-auto -mx-1 touch-pan-x scroll-smooth">
              <div className="w-full min-w-[600px]">
                {/* 月份标签行 */}
                <div className="flex pl-5 mb-0.5">
                  {weeks.map((week, wi) => {
                    const ml = monthLabels.find((m) => m.weekIndex === wi);
                    return (
                      <div
                        key={wi}
                        className="text-[8px] sm:text-[10px] text-muted-foreground leading-tight overflow-hidden"
                        style={{ width: `${100 / weeks.length}%`, flexShrink: 0 }}
                      >
                        {ml?.label || ""}
                      </div>
                    );
                  })}
                </div>

                {/* 按行渲染：每天一行，每行包含所有周的那一天 */}
                {dayLabels.map((dayLabel, di) => (
                  <div key={di} className="flex items-center mb-[2px] sm:mb-[3px]">
                    {/* 星期标签 */}
                    <div className="w-5 shrink-0 text-[8px] sm:text-[10px] text-muted-foreground text-right pr-1">
                      {di % 2 === 0 ? dayLabel : ""}
                    </div>
                    {/* 当天所有周的格子 */}
                    <div className="flex flex-1 gap-[2px] sm:gap-[3px]">
                      {weeks.map((week, wi) => {
                        const day = week[di];
                        const inRange = day.date >= heatmapStart && day.date <= heatmapEnd;
                        const dateStr = toLocalDateStr(day.date);
                        const isFuture = dateStr > toLocalDateStr(new Date());
                        return (
                          <div
                            key={wi}
                            className={`rounded-[1px] sm:rounded-sm ${
                              inRange && !isFuture
                                ? getHeatColor(day.count)
                                : "bg-transparent"
                            } ${inRange && !isFuture ? "cursor-pointer" : ""}`}
                            style={{
                              width: `${100 / weeks.length}%`,
                              paddingBottom: `${100 / weeks.length}%`,
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              if (!inRange || isFuture) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltip({
                                text: `${day.count}篇贡献度：${dateStr}`,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 8,
                              });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* 图例 */}
                <div className="flex items-center gap-1 mt-2 sm:mt-3 justify-end pr-5">
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground mr-0.5">
                    少
                  </span>
                  <div className="w-3 h-3 rounded-sm bg-muted" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-100" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-300" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground ml-0.5">
                    多
                  </span>
                </div>
              </div>
              {/* Tooltip */}
              {tooltip && (
                <div
                  className="fixed z-50 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs whitespace-nowrap pointer-events-none shadow-lg"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  {tooltip.text}
                </div>
              )}
            </div>

            {/* 月度汇总 — 横向滑动 */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                {data.isCurrentYear ? "最近一年" : `${year} 年`}月度分布
              </p>
              <div className="overflow-x-auto touch-pan-x scroll-smooth">
                <div className="flex items-end gap-1 h-16 min-w-[400px]">
                  {data.monthCounts.map((count, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-0.5 min-w-[24px]"
                    >
                      <span className="text-[9px] text-muted-foreground">
                        {count || ""}
                      </span>
                      <div
                        className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-colors min-h-[2px]"
                        style={{
                          height: `${Math.max((count / Math.max(...data.monthCounts, 1)) * 48, count > 0 ? 2 : 0)}px`,
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            text: `${data.monthLabels[i]}: ${count} 篇`,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                      <span className="text-[9px] text-muted-foreground">
                        {data.monthLabels[i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 本周活跃度 */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-[family-name:var(--font-serif)] font-bold text-base mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              本周活跃度
            </h3>
            <div className="flex items-end gap-2 h-32 mb-2">
              {weekDailyCount.map((d, i) => {
                const h = Math.max(
                  (d.count / maxWeekCount) * 100,
                  4
                );
                const isToday =
                  d.date === toLocalDateStr(new Date());
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {d.count}
                    </span>
                    <div
                      className={`w-full rounded-md transition-all ${
                        isToday
                          ? "bg-primary"
                          : "bg-border hover:bg-primary/40"
                      }`}
                      style={{ height: `${h}%`, minHeight: 4 }}
                    />
                    <span
                      className={`text-[10px] ${
                        isToday
                          ? "text-primary font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      周{weekDays[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatDate(weekDailyCount[0]?.date)}</span>
              <span>{formatDate(weekDailyCount[6]?.date)}</span>
            </div>
          </div>

          {/* 最近动态 */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[family-name:var(--font-serif)] font-bold text-base flex items-center gap-2">
                <Feather className="w-4 h-4 text-primary" />
                最近动态
              </h3>
              <Link
                href="/diary"
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                查看全部
              </Link>
            </div>
            {recentDiaries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无记录
              </p>
            ) : (
              <div className="space-y-3">
                {recentDiaries.map((diary) => (
                  <Link
                    key={diary.id}
                    href={`/diary/${diary.id}/edit`}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {diary.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(diary.date)}
                        </span>
                        {diary.tags.length > 0 && (
                          <div className="flex gap-1">
                            {diary.tags.slice(0, 2).map((t) => (
                              <span
                                key={t.id}
                                className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px]"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-0.5 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧面板 */}
        <div className="space-y-5">
          {/* 快速记录 */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-[family-name:var(--font-serif)] font-bold text-base mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              快速记录
            </h3>
            <div className="space-y-1.5">
              <Link
                href="/diary/new"
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Feather className="w-4 h-4 text-primary" />
                写一篇新日记
              </Link>
              <Link
                href="/weekly/new"
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <CalendarDays className="w-4 h-4 text-success" />
                写一份新周报
              </Link>
            </div>
          </div>

          {/* 本周总结 */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-[family-name:var(--font-serif)] font-bold text-base mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              本周总结
            </h3>
            {stats.weekDiaryCount === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                本周暂无记录
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">条目数量</span>
                  <span className="text-foreground font-medium">
                    {stats.weekDiaryCount} 篇
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">活跃天数</span>
                  <span className="text-foreground font-medium">
                    {stats.activeDays} 天
                  </span>
                </div>
                {topTags.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-2">
                      热门标签
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {topTags.map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs"
                        >
                          {t.name}
                          <span className="opacity-50 ml-0.5">{t.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 贡献说明 */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-[family-name:var(--font-serif)] font-bold text-base mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              活跃度说明
            </h3>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                <span className="font-medium text-foreground">贡献日记</span>
                ：每天记录的日记数量。每个方格代表一天，颜色越深表示当天日记越多。
              </p>
              <p>
                <span className="font-medium text-foreground">日报</span>
                ：单日内的日记记录，可在日历视图中按日期查看。
              </p>
              <p>
                <span className="font-medium text-foreground">周报</span>
                ：基于一周日记自动生成的周报总结，当前共{" "}
                <span className="text-primary font-bold">
                  {stats.totalWeeklies}
                </span>{" "}
                份。
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
