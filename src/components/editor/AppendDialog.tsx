"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AppendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppend: (text: string) => void;
  type: "diary" | "daily_report";
}

export function AppendDialog({ open, onOpenChange, onAppend, type }: AppendDialogProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [optimized, setOptimized] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleOptimize = async () => {
    if (!text.trim()) {
      setError("请先输入要追加的内容");
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
        body: JSON.stringify({ content: text, type }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.optimized) {
        setOptimized(data.optimized);
        setShowPreview(true);
      } else {
        setError("AI 返回数据异常");
      }
    } catch {
      setError("网络请求失败");
    }
    setLoading(false);
  };

  const handleAcceptOptimized = () => {
    setText(optimized);
    setOptimized("");
    setShowPreview(false);
  };

  const handleRejectOptimized = () => {
    setOptimized("");
    setShowPreview(false);
  };

  const handleConfirm = () => {
    if (!text.trim()) return;
    onAppend(text.trim());
    setText("");
    setOptimized("");
    setShowPreview(false);
    setError("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setText("");
    setOptimized("");
    setShowPreview(false);
    setError("");
    onOpenChange(false);
  };

  const typeLabel = type === "diary" ? "日记" : "日报";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>追加{typeLabel}内容</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (showPreview) handleRejectOptimized();
            }}
            placeholder="输入要追加的内容..."
            className="w-full min-h-[200px] p-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
          />

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
              {loading ? "优化中..." : `AI优化`}
            </Button>
          </div>

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          {showPreview && optimized && (
            <div className="rounded-lg border border-primary/30 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border-b border-primary/10">
                <span className="text-xs font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  优化结果
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" onClick={handleAcceptOptimized} className="h-6 text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    采用
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleRejectOptimized} className="h-6 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    放弃
                  </Button>
                </div>
              </div>
              <div className="p-3 text-xs whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                {optimized}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!text.trim()}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            确认追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
