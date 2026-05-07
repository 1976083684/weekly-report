"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { MoodSelector } from "@/components/editor/MoodSelector";
import { TagInput } from "@/components/editor/TagInput";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";

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
  const [alert, setAlert] = useState<{
    open: boolean;
    type: "success" | "error";
    message: string;
    onConfirm?: () => void;
  }>({ open: false, type: "success", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const body = {
      title,
      content,
      date,
      mood,
      tagIds: tags.map((t) => t.id),
    };

    try {
      const url = initialData
        ? `/api/diary/${initialData.id}`
        : "/api/diary";
      const method = initialData ? "PUT" : "POST";
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

      toast("success", "保存成功");
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
        <Button type="submit" disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? "保存中..." : "保存"}
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
        placeholder="标题..."
        className="text-lg font-medium border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
        required
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">日期：</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
            required
          />
        </div>
        <MoodSelector value={mood} onChange={setMood} />
      </div>

      <MarkdownEditor
        value={content}
        onChange={setContent}
        placeholder="今天发生了什么..."
        minHeight="400px"
      />

      <TagInput selected={tags} onChange={setTags} />
    </form>
  );
}
