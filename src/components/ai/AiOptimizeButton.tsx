"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiOptimizeButtonProps {
  content: string;
  type: "diary" | "daily_report" | "weekly";
  onAccept: (optimized: string) => void;
  className?: string;
  placeholder?: string;
}

export function AiOptimizeButton({
  content,
  type,
  onAccept,
  className,
  placeholder,
}: AiOptimizeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [optimized, setOptimized] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const handleOptimize = async () => {
    if (!content.trim()) {
      setError(placeholder || "请先输入内容");
      return;
    }
    setError("");
    setLoading(true);
    setOptimized("");
    setShowPreview(false);

    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type }),
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.error) {
          setError(data.error);
        } else if (data.optimized) {
          setOptimized(data.optimized);
          setShowPreview(true);
        } else {
          setError("AI 返回数据异常");
        }
      } catch {
        setError(`服务器错误 (${res.status})，请重启 dev server 后重试`);
      }
    } catch {
      setError("网络请求失败，请检查 dev server 是否在运行");
    }
    setLoading(false);
  };

  const handleAccept = () => {
    onAccept(optimized);
    setOptimized("");
    setShowPreview(false);
    setShowDiff(false);
  };

  const handleReject = () => {
    setOptimized("");
    setShowPreview(false);
    setShowDiff(false);
  };

  const typeLabel = type === "diary" ? "日记" : type === "daily_report" ? "日报" : "周报";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOptimize}
          disabled={loading}
          className="text-primary border-primary/30 hover:bg-primary/5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          )}
          {loading ? "AI优化中..." : `AI优化${typeLabel}`}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
          {error}
        </div>
      )}

      {showPreview && optimized && (
        <div className="bg-card rounded-xl border border-primary/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-primary/10">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              AI 优化结果
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowDiff(!showDiff)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showDiff ? "隐藏" : "查看"}对比
                {showDiff ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="h-7 text-xs bg-success hover:bg-success/90"
              >
                <Check className="w-3 h-3 mr-1" />
                采纳
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                className="h-7 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                放弃
              </Button>
            </div>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {showDiff ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">原文</h4>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-3 max-h-[400px] overflow-y-auto">
                    {content}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-primary mb-2">优化后</h4>
                  <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-primary/5 rounded-lg p-3 max-h-[400px] overflow-y-auto">
                    {optimized}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {optimized}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
