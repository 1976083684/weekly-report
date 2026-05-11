"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROMPTS } from "@/lib/default-prompts";

export default function PromptsPage() {
  const [diaryPrompt, setDiaryPrompt] = useState("");
  const [reportPrompt, setReportPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const res = await fetch("/api/settings/prompts");
      const data = await res.json();
      setDiaryPrompt(data.prompts?.diary || DEFAULT_PROMPTS.diary);
      setReportPrompt(data.prompts?.report || DEFAULT_PROMPTS.report);
    } catch {
      setDiaryPrompt(DEFAULT_PROMPTS.diary);
      setReportPrompt(DEFAULT_PROMPTS.report);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/settings/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompts: { diary: diaryPrompt, report: reportPrompt },
        }),
      });
      if (res.ok) {
        setSaveMsg("保存成功");
        setTimeout(() => setSaveMsg(""), 3000);
      } else {
        const data = await res.json();
        setSaveMsg(data.error || "保存失败");
      }
    } catch {
      setSaveMsg("网络请求失败");
    }
    setSaving(false);
  };

  const handleReset = (type: "diary" | "report") => {
    if (type === "diary") setDiaryPrompt(DEFAULT_PROMPTS.diary);
    else setReportPrompt(DEFAULT_PROMPTS.report);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center text-sm text-muted-foreground">加载中...</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回设置
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">提示词配置</h1>

      {/* 日记提示词 */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">日记优化提示词</label>
          <button
            type="button"
            onClick={() => handleReset("diary")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="恢复默认"
          >
            <RotateCcw className="w-3 h-3" />
            恢复默认
          </button>
        </div>
        <textarea
          value={diaryPrompt}
          onChange={(e) => setDiaryPrompt(e.target.value)}
          rows={16}
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-muted/50 p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />
      </div>

      {/* 日报/周报提示词 */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">日报/周报优化提示词</label>
          <button
            type="button"
            onClick={() => handleReset("report")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="恢复默认"
          >
            <RotateCcw className="w-3 h-3" />
            恢复默认
          </button>
        </div>
        <textarea
          value={reportPrompt}
          onChange={(e) => setReportPrompt(e.target.value)}
          rows={16}
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-muted/50 p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />
      </div>

      {/* 保存 */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          保存提示词
        </Button>
        {saveMsg && (
          <span className={`text-xs ${saveMsg === "保存成功" ? "text-success" : "text-danger"}`}>
            {saveMsg}
          </span>
        )}
      </div>
    </div>
  );
}
