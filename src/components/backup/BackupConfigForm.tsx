"use client";

import { useState, useEffect } from "react";
import { Save, Download, Loader2, CheckCircle2, XCircle, Link2, CloudUpload, Eye, EyeOff, Clock } from "lucide-react";
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
    hasToken?: boolean;
    scheduleEnabled?: boolean;
    scheduleScope?: string;
    scheduleTime?: string | null;
    scheduleLastRun?: string | null;
  } | null;
  onSuccess: () => void;
}

/** Compute next Sunday 23:00 local time as YYYY-MM-DDTHH:mm string */
function getNextSunday23(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);
  sunday.setHours(23, 0, 0, 0);
  return toDatetimeLocal(sunday);
}

function toDatetimeLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${date}T${hours}:${minutes}`;
}

function formatDateTime(isoStr?: string | null): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function BackupConfigForm({ provider, initialData, onSuccess }: BackupConfigFormProps) {
  const [repoUrl, setRepoUrl] = useState(initialData?.repoUrl || "");
  const [branch, setBranch] = useState(initialData?.branch || "main");
  const [path, setPath] = useState(initialData?.path || "diary/");
  const [token, setToken] = useState("");
  const [tokenShown, setTokenShown] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);
  const [scope, setScope] = useState("week");
  const [saving, setSaving] = useState(false);
  const [backing, setBacking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(initialData?.scheduleEnabled || false);
  const [scheduleTime, setScheduleTime] = useState(() => {
    if (initialData?.scheduleTime) return toDatetimeLocal(new Date(initialData.scheduleTime));
    return getNextSunday23();
  });

  // When toggle is turned on, auto-set to next Sunday 23:00 if empty
  useEffect(() => {
    if (scheduleEnabled && !scheduleTime) {
      setScheduleTime(getNextSunday23());
    }
  }, [scheduleEnabled, scheduleTime]);

  const hasSavedToken = !!initialData?.hasToken;

  const handleRevealToken = async () => {
    if (tokenShown) {
      setTokenShown(false);
      setToken("");
      return;
    }
    if (!initialData?.id) return;
    setLoadingToken(true);
    try {
      const res = await fetch("/api/backup/config/decrypt-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: initialData.id }),
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setTokenShown(true);
      }
    } catch {
      // ignore
    }
    setLoadingToken(false);
  };

  const buildScheduleBody = () => ({
    scheduleEnabled,
    scheduleScope: scope,
    scheduleTime: scheduleEnabled ? new Date(scheduleTime).toISOString() : null,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/backup/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider, repoUrl, branch, path,
          token: token || undefined,
          ...buildScheduleBody(),
        }),
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

  const handleSaveAndSync = async () => {
    setBacking(true);
    setResult(null);
    try {
      const saveRes = await fetch("/api/backup/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider, repoUrl, branch, path,
          token: token || undefined,
          ...buildScheduleBody(),
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setResult(`保存失败：${saveData.error}`);
        setBacking(false);
        return;
      }

      const configId = saveData.configId;

      const backupRes = await fetch("/api/backup/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId, scope }),
      });
      const backupData = await backupRes.json();
      if (backupData.success) {
        setResult(`保存并同步成功：${backupData.message}`);
      } else {
        setResult(`同步失败：${backupData.message || backupData.error}（配置已保存）`);
      }
      onSuccess();
    } catch {
      setResult("同步失败（配置已保存）");
    }
    setBacking(false);
  };

  const handleBackup = async () => {
    if (!initialData?.id) return;
    setBacking(true);
    setResult(null);
    try {
      const res = await fetch("/api/backup/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: initialData.id, scope }),
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

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const body: Record<string, string> = { provider, repoUrl };
      if (token) {
        body.token = token;
      } else if (initialData?.id) {
        body.configId = initialData.id;
      } else {
        setResult("请先输入 Access Token 或保存配置");
        setTesting(false);
        return;
      }
      const res = await fetch("/api/backup/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`连接成功：${data.message}`);
      } else {
        setResult(`连接失败：${data.error}`);
      }
    } catch {
      setResult("连接测试失败");
    }
    setTesting(false);
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
        <div className="relative">
          <Input
            type={tokenShown ? "text" : "password"}
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              if (tokenShown) setTokenShown(false);
            }}
            placeholder={
              hasSavedToken && !tokenShown
                ? "••••••••（已保存）"
                : initialData
                ? "留空则使用已保存的Token"
                : "输入 Access Token"
            }
            className="h-9 text-sm pr-8"
          />
          {hasSavedToken && (
            <button
              type="button"
              onClick={handleRevealToken}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title={tokenShown ? "隐藏" : "显示已保存的Token"}
            >
              {loadingToken ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : tokenShown ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Backup scope */}
      <div className="flex items-center gap-2">
        <Label className="text-xs shrink-0">备份范围：</Label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="h-8 px-2 rounded border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="week">本周</option>
          <option value="month">近一月</option>
          <option value="all">全部</option>
        </select>
      </div>

      {/* Schedule toggle */}
      <div className="border-t border-border pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs">定时备份</Label>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={scheduleEnabled}
            onClick={() => setScheduleEnabled(!scheduleEnabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${scheduleEnabled ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${scheduleEnabled ? "translate-x-[18px]" : "translate-x-[3px]"}`}
            />
          </button>
        </div>

        {scheduleEnabled && (
          <div className="space-y-2 pl-6">
            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">执行时间：</Label>
              <Input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-8 text-xs w-auto"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              默认每周日 23:00 执行，届时自动按「备份范围」设定的范围备份。时间到达后自动更新为下周同时段。
            </p>
            {initialData?.scheduleLastRun && (
              <p className="text-[10px] text-muted-foreground">
                上次执行：{formatDateTime(initialData.scheduleLastRun)}
              </p>
            )}
          </div>
        )}
      </div>

      {result && (
        <p className={`text-xs flex items-center gap-1 ${
          result.startsWith("备份成功") || result === "配置已保存" || result.startsWith("连接成功") || result.startsWith("保存并同步成功")
            ? "text-success"
            : "text-danger"
        }`}>
          {result.startsWith("备份成功") || result === "配置已保存" || result.startsWith("连接成功") || result.startsWith("保存并同步成功") ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          {result}
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          保存配置
        </Button>
        <Button onClick={handleTest} disabled={testing} variant="secondary" size="sm">
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Link2 className="w-3.5 h-3.5 mr-1" />}
          测试连接
        </Button>
        <Button onClick={handleSaveAndSync} disabled={backing} variant="outline" size="sm">
          {backing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CloudUpload className="w-3.5 h-3.5 mr-1" />}
          保存并同步
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
