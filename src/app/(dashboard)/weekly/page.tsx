"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, X, Trash2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface Weekly {
  id: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
}

export default function WeeklyPage() {
  const [weeklies, setWeeklies] = useState<Weekly[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchWeeklies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`/api/weekly?${params}`);
    const data = await res.json();
    setWeeklies(data.weeklies || []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [search, startDate, endDate, page, pageSize]);

  useEffect(() => {
    fetchWeeklies();
  }, [fetchWeeklies]);

  const deleteWeekly = async (id: string) => {
    if (!confirm("确定删除这份周报？此操作不可撤销。")) return;
    await fetch(`/api/weekly/${id}`, { method: "DELETE" });
    fetchWeeklies();
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
      ) : weeklies.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm mb-4">还没有周报</p>
          <Link href="/weekly/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              写第一份周报
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {weeklies.map((weekly) => (
            <Link
              key={weekly.id}
              href={`/weekly/${weekly.id}/edit`}
              className="block"
            >
              <article className="bg-card rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate mb-1">
                      {weekly.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {truncate(weekly.content.replace(/[#*`\-]/g, ""), 120)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(weekly.startDate)} ~ {formatDate(weekly.endDate)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      deleteWeekly(weekly.id);
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
                {page} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
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
