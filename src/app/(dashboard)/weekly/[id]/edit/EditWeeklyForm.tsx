"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";

interface EditWeeklyFormProps {
  id: string;
  initialTitle: string;
  initialContent: string;
  initialStartDate: string;
  initialEndDate: string;
}

export function EditWeeklyForm({
  id,
  initialTitle,
  initialContent,
  initialStartDate,
  initialEndDate,
}: EditWeeklyFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/weekly/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, startDate, endDate }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "保存失败");
        setLoading(false);
        return;
      }

      router.push("/weekly");
      router.refresh();
    } catch {
      setError("保存失败");
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
        <h1 className="text-xl font-semibold text-foreground flex-1">编辑周报</h1>
        <Button type="submit" disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? "保存中..." : "保存"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="周报标题..."
        className="text-lg font-medium border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
        required
      />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">日期：</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      <MarkdownEditor
        value={content}
        onChange={setContent}
        minHeight="500px"
      />
    </form>
  );
}
