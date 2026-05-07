"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, X, Pin, Trash2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";

const moods: Record<string, string> = {
  happy: "😊",
  calm: "😌",
  normal: "😐",
  sad: "😢",
  awful: "😞",
};

interface Diary {
  id: string;
  title: string;
  content: string;
  date: string;
  mood?: string | null;
  pinned: boolean;
  tags: { tag: { id: string; name: string } }[];
}

interface Tag {
  id: string;
  name: string;
}

export default function DiaryPage() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDiaries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", "diary");
    if (search) params.set("search", search);
    if (selectedTag) params.set("tagId", selectedTag);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`/api/diary?${params}`);
    const data = await res.json();
    setDiaries(data.diaries || []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [search, selectedTag, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => {});
  }, []);

  const togglePin = async (id: string) => {
    await fetch(`/api/diary/${id}`, { method: "POST" });
    fetchDiaries();
  };

  const deleteDiary = async (id: string) => {
    if (!confirm("确定删除这篇日记？此操作不可撤销。")) return;
    await fetch(`/api/diary/${id}`, { method: "DELETE" });
    fetchDiaries();
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return "今天";
    if (diff === 1) return "昨天";
    if (diff === 2) return "前天";
    const m = d.getMonth() + 1;
    const dy = d.getDate();
    const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${m}月${dy}日 ${week[d.getDay()]}`;
  };

  const truncate = (text: string, n: number) =>
    text.length > n ? text.slice(0, n) + "..." : text;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">我的日记</h1>
        <Link href="/diary/new">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            写日记
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜索日记..."
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
        <select
          value={selectedTag}
          onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">全部标签</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <DateRangePicker
          startDate={dateFrom}
          endDate={dateTo}
          onChange={(s, e) => {
            setDateFrom(s);
            setDateTo(e);
            setPage(1);
          }}
        />
        {(search || selectedTag || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setSelectedTag("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
            className="shrink-0 text-muted-foreground"
            title="重置搜索条件"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {diaries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm mb-4">还没有日记</p>
          <Link href="/diary/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              写第一篇日记
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {diaries.map((diary) => (
            <Link
              key={diary.id}
              href={`/diary/${diary.id}/edit`}
              className="block"
            >
              <article
                className={cn(
                  "bg-card rounded-xl border border-border p-4 transition-colors hover:border-primary/30",
                  diary.pinned && "border-primary/20 bg-primary/[0.02]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {diary.pinned && (
                        <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      <h3 className="font-medium text-foreground truncate">
                        {diary.title}
                      </h3>
                      {diary.mood && (
                        <span className="text-sm shrink-0">{moods[diary.mood]}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {truncate(diary.content.replace(/[#*`\-]/g, ""), 120)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(diary.date)}
                      </span>
                      {diary.tags.length > 0 && (
                        <div className="flex gap-1">
                          {diary.tags.map(({ tag }) => (
                            <span
                              key={tag.id}
                              className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        togglePin(diary.id);
                      }}
                      className={cn(
                        "p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors",
                        diary.pinned && "text-primary"
                      )}
                      title={diary.pinned ? "取消置顶" : "置顶"}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        deleteDiary(diary.id);
                      }}
                      className="p-1.5 rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
