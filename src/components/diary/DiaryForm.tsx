"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { MoodSelector } from "@/components/editor/MoodSelector";
import { TagInput } from "@/components/editor/TagInput";
import { AiOptimizeButton } from "@/components/ai/AiOptimizeButton";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";

const weekLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function defaultTitle(date: string): string {
  const d = new Date(date + "T00:00:00");
  return `${weekLabels[d.getDay()]} ${date} 日记`;
}

interface Tag {
  id: string;
  name: string;
}

interface DiaryFormProps {
  initialData?: {
    id: string;
    title: string;
    content: string;
    date: string;
    mood?: string | null;
    tags?: { tag: Tag }[];
    tagIds?: string[];
  };
}

export function DiaryForm({ initialData }: DiaryFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().slice(0, 10)
  );
  const [mood, setMood] = useState(initialData?.mood || null);
  const [tags, setTags] = useState<Tag[]>(
    initialData?.tags?.map((t) => t.tag) || []
  );
  const [loading, setLoading] = useState(false);
  const [loadingDiary, setLoadingDiary] = useState(false);
  const [existingDiaryId, setExistingDiaryId] = useState<string | null>(initialData?.id || null);
  const [alert, setAlert] = useState<{
    open: boolean;
    type: "success" | "error";
    message: string;
    onConfirm?: () => void;
  }>({ open: false, type: "success", message: "" });

  // When date changes (and not in initial-data mode), load diary for that date
  const loadDiaryByDate = useCallback(async (targetDate: string) => {
    if (initialData?.date === targetDate) return; // Already loaded via initialData
    setLoadingDiary(true);
    try {
      const params = new URLSearchParams();
      params.set("dateFrom", targetDate);
      params.set("dateTo", targetDate);
      params.set("type", "diary");
      params.set("pageSize", "1");
      const res = await fetch(`/api/diary?${params}`);
      const data = await res.json();
      const list = data.diaries || [];
      if (list.length > 0) {
        const d = list[0];
        const dateStr = d.date.slice(0, 10);
        setExistingDiaryId(d.id);
        // Only pre-fill if user hasn't already typed content
        if (!content) {
          setContent(d.content || "");
          setTitle(d.title || "");
          setMood(d.mood || null);
          setTags((d.tags || []).map((t: { tag: Tag }) => t.tag));
        }
        toast("success", `已加载 ${dateStr} 的日记`);
      } else {
        setExistingDiaryId(null);
      }
    } catch {
      // ignore
    }
    setLoadingDiary(false);
  }, [initialData]);

  useEffect(() => {
    if (!initialData) {
      loadDiaryByDate(date);
    }
  }, [date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const resolvedTitle = title.trim() || defaultTitle(date);
    const body = {
      title: resolvedTitle,
      content,
      date,
      mood,
      type: "diary",
      tagIds: tags.map((t) => t.id),
    };

    try {
      const targetId = existingDiaryId || initialData?.id;
      const url = targetId
        ? `/api/diary/${targetId}`
        : "/api/diary";
      const method = targetId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setAlert({ open: true, type: "error", message: data.error || "保存失败" });
        setLoading(false);
        return;
      }

      toast("success", existingDiaryId ? "已覆盖保存" : "保存成功");
      setTimeout(() => {
        router.push("/diary");
        router.refresh();
      }, 800);
    } catch {
      setAlert({ open: true, type: "error", message: "保存失败，请稍后重试" });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground flex-1">
          {initialData ? "编辑日记" : "写日记"}
        </h1>
        <Button type="submit" disabled={loading || loadingDiary}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? "保存中..." : existingDiaryId ? "覆盖保存" : "保存"}
        </Button>
      </div>

      <AlertDialog
        open={alert.open}
        onOpenChange={(open) => {
          setAlert((prev) => ({ ...prev, open }));
          if (!open) setLoading(false);
        }}
        type={alert.type}
        message={alert.message}
        onConfirm={alert.onConfirm}
      />

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={date ? `不填则使用：${defaultTitle(date)}` : "标题..."}
        className="text-lg font-medium border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">日期：</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setExistingDiaryId(null);
              setContent("");
              setTitle("");
              setMood(null);
              setTags([]);
            }}
            className="w-auto"
            required
          />
          {loadingDiary && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {existingDiaryId && !loadingDiary && (
            <span className="text-xs text-success">已加载当日日记，保存将覆盖</span>
          )}
        </div>
        <MoodSelector value={mood} onChange={setMood} />
      </div>

      <MarkdownEditor
        value={content}
        onChange={setContent}
        placeholder="今天发生了什么..."
        minHeight="400px"
      />

      <AiOptimizeButton
        content={content}
        type="diary"
        onAccept={(optimized) => setContent(optimized)}
        placeholder="今天发生了什么..."
      />

      <TagInput selected={tags} onChange={setTags} />
    </form>
  );
}
