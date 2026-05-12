"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, X, Trash2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface TimelineItem {
  id: string;
  title: string;
  content: string;
  date: string;
  endDate?: string;
  kind: "weekly" | "daily_report";
}

export default function WeeklyPage() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch weeklies
    const weeklyParams = new URLSearchParams();
    if (search) weeklyParams.set("search", search);
    if (startDate) weeklyParams.set("startDate", startDate);
    if (endDate) weeklyParams.set("endDate", endDate);
    weeklyParams.set("page", String(page));
    weeklyParams.set("pageSize", String(pageSize));

    // Fetch daily reports
    const diaryParams = new URLSearchParams();
    diaryParams.set("type", "daily_report");
    if (search) diaryParams.set("search", search);
    if (startDate) diaryParams.set("dateFrom", startDate);
    if (endDate) diaryParams.set("dateTo", endDate);
    diaryParams.set("page", "1");
    diaryParams.set("pageSize", "100");

    const [weeklyRes, diaryRes] = await Promise.all([
      fetch(`/api/weekly?${weeklyParams}`),
      fetch(`/api/diary?${diaryParams}`),
    ]);
    const weeklyData = await weeklyRes.json();
    const diaryData = await diaryRes.json();

    const merged: TimelineItem[] = [
      ...(weeklyData.weeklies || []).map((w: { id: string; title: string; content: string; startDate: string; endDate: string }) => ({
        id: w.id,
        title: w.title,
        content: w.content,
        date: w.startDate,
        endDate: w.endDate,
        kind: "weekly" as const,
      })),
      ...(diaryData.diaries || []).map((d: { id: string; title: string; content: string; date: string }) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        date: d.date.slice(0, 10),
        kind: "daily_report" as const,
      })),
    ];

    // Sort: group by week, weekly first in each week, then daily reports Mon-Sun
    // Most recent week first
    const getMonday = (dateStr: string) => {
      // Normalize: dateStr may be full ISO ("2026-05-11T00:00:00.000Z") or date-only ("2026-05-11")
      const dateOnly = dateStr.slice(0, 10);
      const d = new Date(dateOnly + "T12:00:00");
      if (isNaN(d.getTime())) return dateOnly; // fallback for invalid dates
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    merged.sort((a, b) => {
      const weekA = getMonday(a.date);
      const weekB = getMonday(b.date);
      // Recent weeks first
      if (weekB !== weekA) return weekB.localeCompare(weekA);
      // Weekly at top of the week, then daily reports newest first
      if (a.kind !== b.kind) return a.kind === "weekly" ? -1 : 1;
      // Daily reports: newest first (descending)
      return b.date.localeCompare(a.date);
    });

    setItems(merged);
    setLoading(false);
  }, [search, startDate, endDate, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteItem = async (id: string, kind: string) => {
    const label = kind === "weekly" ? "周报" : "日报";
    if (!confirm(`确定删除这份${label}？此操作不可撤销。`)) return;
    const apiPath = kind === "weekly" ? `/api/weekly/${id}` : `/api/diary/${id}`;
    await fetch(apiPath, { method: "DELETE" });
    fetchData();
  };

  const handleReset = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasFilters = search || startDate || endDate;

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // Client-side pagination after merge
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const displayTotalPages = Math.ceil(items.length / pageSize) || 1;

  const truncate = (text: string, n: number) =>
    text.length > n ? text.slice(0, n) + "..." : text;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">周报</h1>
        <Link href="/weekly/new">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            写周报
          </Button>
        </Link>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索周报内容..."
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
            setPage(1);
          }}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="shrink-0 text-muted-foreground"
            title="重置搜索条件"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">加载中...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm mb-4">还没有周报或日报</p>
          <Link href="/weekly/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              写第一份周报
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pagedItems.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.kind === "weekly" ? `/weekly/${item.id}/edit` : `/diary/${item.id}/edit`}
              className="block"
            >
              <article className="bg-card rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={item.kind === "weekly" ? "text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded font-medium" : "text-blue-500 text-xs bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded font-medium"}>
                        {item.kind === "weekly" ? "周报" : "日报"}
                      </span>
                      <h3 className="font-medium text-foreground truncate">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {truncate(item.content.replace(/[#*`\-]/g, ""), 120)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {item.kind === "weekly" && item.endDate
                        ? `${formatDate(item.date)} ~ ${formatDate(item.endDate)}`
                        : formatDate(item.date)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      deleteItem(item.id, item.kind);
                    }}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors shrink-0"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            </Link>
          ))}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">每页</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 px-1.5 rounded border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {[10, 20, 30, 40, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">条</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {displayTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= displayTotalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
