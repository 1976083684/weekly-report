"use client";

import { useState } from "react";
import { Save, Download, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BackupConfigFormProps {
  provider: "github" | "gitee";
  initialData?: {
    id: string;
    repoUrl: string;
    branch: string;
    path: string;
  } | null;
  onSuccess: () => void;
}

export function BackupConfigForm({ provider, initialData, onSuccess }: BackupConfigFormProps) {
  const [repoUrl, setRepoUrl] = useState(initialData?.repoUrl || "");
  const [branch, setBranch] = useState(initialData?.branch || "main");
  const [path, setPath] = useState(initialData?.path || "diary/");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [backing, setBacking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/backup/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, repoUrl, branch, path, token: token || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult("配置已保存");
        onSuccess();
      } else {
        setResult(`失败: ${data.error}`);
      }
    } catch {
      setResult("保存失败");
    }
    setSaving(false);
  };

  const handleBackup = async () => {
    if (!initialData?.id) return;
    setBacking(true);
    setResult(null);
    try {
      const res = await fetch("/api/backup/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: initialData.id }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`备份成功：${data.message}`);
      } else {
        setResult(`备份失败：${data.message || data.error}`);
      }
    } catch {
      setResult("备份失败");
    }
    setBacking(false);
  };

  return (
    <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
      <h3 className="font-medium text-sm text-foreground capitalize">{provider} 备份</h3>

      <div className="space-y-1.5">
        <Label className="text-xs">仓库地址</Label>
        <Input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder={`https://${provider}.com/username/repo`}
          className="h-9 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">分支</Label>
          <Input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">备份路径</Label>
          <Input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="diary/"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Access Token</Label>
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={initialData ? "留空则使用已保存的Token" : "输入 Access Token"}
          className="h-9 text-sm"
        />
      </div>

      {result && (
        <p className={`text-xs flex items-center gap-1 ${
          result.startsWith("备份成功") || result === "配置已保存"
            ? "text-success"
            : "text-danger"
        }`}>
          {result.startsWith("备份成功") || result === "配置已保存" ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          {result}
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          保存配置
        </Button>
        {initialData?.id && (
          <Button onClick={handleBackup} disabled={backing} variant="outline" size="sm">
            {backing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
            立即备份
          </Button>
        )}
      </div>
    </div>
  );
}
