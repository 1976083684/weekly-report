"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Cloud, Clock, Loader2, Save, ChevronDown } from "lucide-react";
import { BackupConfigForm } from "@/components/backup/BackupConfigForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface BackupConfig {
  id: string;
  provider: string;
  repoUrl: string;
  branch: string;
  path: string;
  hasToken?: boolean;
  scheduleEnabled?: boolean;
  scheduleScope?: string;
  scheduleTime?: string | null;
  scheduleLastRun?: string | null;
  scheduleInterval?: number;
}

const INTERVAL_OPTIONS = [
  { label: "5 秒", value: 5000 },
  { label: "1 分钟", value: 60000 },
  { label: "1 小时", value: 3600000 },
  { label: "2 小时", value: 7200000 },
];

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function formatInterval(ms: number): string {
  if (ms < 60000) return `${ms / 1000} 秒`;
  if (ms < 3600000) return `${ms / 60000} 分钟`;
  return `${ms / 3600000} 小时`;
}

const STORAGE_KEY = "backup-selected-provider";

export default function BackupPage() {
  const [configs, setConfigs] = useState<BackupConfig[]>([]);
  const [expanded, setExpanded] = useState<"github" | "gitee" | "schedule" | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [togglingSchedule, setTogglingSchedule] = useState(false);

  // Schedule detail state
  const [scheduleInterval, setScheduleInterval] = useState(3600000);
  const [scheduleLogs, setScheduleLogs] = useState<{ id: string; type: string; status: string; message: string; createdAt: string }[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [savingInterval, setSavingInterval] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<string | null>(null);

  // 从 localStorage 读取选中的 provider
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "github" || saved === "gitee") setSelectedProvider(saved);
  }, []);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/backup/config");
    if (res.ok) {
      const data = await res.json();
      setConfigs(data.configs || []);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch schedule data when schedule card expands
  useEffect(() => {
    if (expanded !== "schedule") return;
    const fetchSchedule = async () => {
      setLoadingLogs(true);
      setScheduleResult(null);
      try {
        const intervalRes = await fetch("/api/backup/schedule/interval");
        if (intervalRes.ok) {
          const data = await intervalRes.json();
          setScheduleInterval(data.interval || 3600000);
        }
        const cfg = selectedProvider ? getConfig(selectedProvider) : null;
        if (cfg?.id) {
          const logsRes = await fetch(`/api/backup/schedule/logs?configId=${cfg.id}`);
          if (logsRes.ok) {
            const data = await logsRes.json();
            setScheduleLogs(data.logs || []);
          }
        } else {
          setScheduleLogs([]);
        }
      } catch { /* ignore */ }
      setLoadingLogs(false);
    };
    fetchSchedule();
  }, [expanded, configs, selectedProvider]);

  const getConfig = (provider: string) => configs.find(c => c.provider === provider) || null;

  // 选中 provider 的配置（定时开关读取此配置的 scheduleEnabled）
  const selectedConfig = selectedProvider ? getConfig(selectedProvider) : null;

  const handleCardClick = (card: "github" | "gitee" | "schedule") => {
    setExpanded(prev => prev === card ? null : card);
  };

  // 启用备份 = 选择 provider + 启用定时（互斥，单次 API 调用）
  const handleActivate = async (provider: "github" | "gitee") => {
    const config = getConfig(provider);
    if (!config) return;
    setSelectedProvider(provider);
    localStorage.setItem(STORAGE_KEY, provider);

    await fetch("/api/backup/activate", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });

    await fetchData();
  };

  // 定时开关 = 控制选中 provider 的 scheduleEnabled
  const handleScheduleToggle = async () => {
    if (!selectedConfig) return;
    setTogglingSchedule(true);
    try {
      await fetch("/api/backup/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedConfig.provider,
          repoUrl: selectedConfig.repoUrl,
          branch: selectedConfig.branch,
          path: selectedConfig.path,
          scheduleEnabled: !selectedConfig.scheduleEnabled,
          scheduleScope: selectedConfig.scheduleScope || "week",
        }),
      });
      await fetchData();
    } catch { /* ignore */ }
    setTogglingSchedule(false);
  };

  const handleSaveInterval = async () => {
    setSavingInterval(true);
    try {
      const res = await fetch("/api/backup/schedule/interval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: scheduleInterval }),
      });
      if (res.ok) {
        setScheduleResult("巡逻间隔已保存");
        fetchData();
      } else {
        setScheduleResult("保存失败");
      }
    } catch {
      setScheduleResult("保存失败");
    }
    setSavingInterval(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        返回设置
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">备份配置</h1>

      {/* 顶部三卡片 */}
      <div className="grid grid-cols-3 gap-3">
        {/* GitHub 卡片 */}
        <div
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
            expanded === "github"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center gap-2.5" onClick={() => handleCardClick("github")}>
            <div className="w-9 h-9 rounded-lg bg-foreground flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-background" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">GitHub</p>
              <p className="text-[10px] text-muted-foreground">
                {!getConfig("github") ? "未配置" : selectedProvider === "github" ? "已启用" : "未启用"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            {getConfig("github") ? (
              selectedProvider === "github" ? (
                <button
                  disabled
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground cursor-not-allowed"
                >
                  启用中
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleActivate("github"); }}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  启用备份
                </button>
              )
            ) : (
              <span className="text-[10px] text-muted-foreground">请先配置</span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded === "github" ? "rotate-180" : ""}`} />
          </div>
        </div>

        {/* Gitee 卡片 */}
        <div
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
            expanded === "gitee"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center gap-2.5" onClick={() => handleCardClick("gitee")}>
            <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Gitee</p>
              <p className="text-[10px] text-muted-foreground">
                {!getConfig("gitee") ? "未配置" : selectedProvider === "gitee" ? "已启用" : "未启用"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            {getConfig("gitee") ? (
              selectedProvider === "gitee" ? (
                <button
                  disabled
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground cursor-not-allowed"
                >
                  启用中
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleActivate("gitee"); }}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  启用备份
                </button>
              )
            ) : (
              <span className="text-[10px] text-muted-foreground">请先配置</span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded === "gitee" ? "rotate-180" : ""}`} />
          </div>
        </div>

        {/* 定时任务卡片 */}
        <div
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
            expanded === "schedule"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center gap-2.5" onClick={() => handleCardClick("schedule")}>
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">定时任务</p>
              <p className="text-[10px] text-muted-foreground">
                {!selectedProvider
                  ? "请先启用备份"
                  : selectedConfig?.scheduleEnabled
                    ? `${selectedProvider} 运行中`
                    : "未开启"
                }
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {togglingSchedule ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!selectedConfig?.scheduleEnabled}
                  onClick={(e) => { e.stopPropagation(); handleScheduleToggle(); }}
                  disabled={!selectedProvider || !selectedConfig}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${selectedConfig?.scheduleEnabled ? "bg-primary" : "bg-muted"} ${!selectedProvider || !selectedConfig ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${selectedConfig?.scheduleEnabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                </button>
              )}
              {selectedConfig?.scheduleEnabled && selectedConfig?.scheduleTime && (
                <span className="text-[10px] text-muted-foreground">
                  {formatDateTime(selectedConfig.scheduleTime)}
                </span>
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded === "schedule" ? "rotate-180" : ""}`} />
          </div>
        </div>
      </div>

      {/* GitHub 配置表单 */}
      {expanded === "github" && (
        <BackupConfigForm
          key={`github-${getConfig("github")?.id || "new"}-${getConfig("github")?.scheduleEnabled}`}
          provider="github"
          initialData={getConfig("github")}
          scheduleEnabled={!!getConfig("github")?.scheduleEnabled}
          onSuccess={fetchData}
        />
      )}

      {/* Gitee 配置表单 */}
      {expanded === "gitee" && (
        <BackupConfigForm
          key={`gitee-${getConfig("gitee")?.id || "new"}-${getConfig("gitee")?.scheduleEnabled}`}
          provider="gitee"
          initialData={getConfig("gitee")}
          scheduleEnabled={!!getConfig("gitee")?.scheduleEnabled}
          onSuccess={fetchData}
        />
      )}

      {/* 定时任务详情 */}
      {expanded === "schedule" && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <h3 className="font-medium text-sm text-foreground">定时任务设置</h3>

          {selectedProvider && selectedConfig ? (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                  {selectedProvider}
                </span>
                <span>
                  {selectedConfig.scheduleEnabled
                    ? `下次执行：${formatDateTime(selectedConfig.scheduleTime)}`
                    : "定时未开启"
                  }
                </span>
              </div>

              {selectedConfig.scheduleLastRun && (
                <p className="text-xs text-muted-foreground">
                  上次执行：{formatDateTime(selectedConfig.scheduleLastRun)}
                </p>
              )}

              {/* 巡逻间隔 */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs">巡逻间隔</Label>
                <p className="text-[10px] text-muted-foreground">定时任务每隔多久检查一次是否到达执行时间</p>
                <div className="grid grid-cols-4 gap-2">
                  {INTERVAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setScheduleInterval(opt.value)}
                      className={`h-8 rounded-md text-xs transition-colors ${
                        scheduleInterval === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Button size="sm" onClick={handleSaveInterval} disabled={savingInterval}>
                  {savingInterval ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  保存间隔
                </Button>
                {scheduleResult && (
                  <p className={`text-xs ${scheduleResult.includes("已保存") ? "text-success" : "text-danger"}`}>
                    {scheduleResult}
                  </p>
                )}
              </div>

              {/* 最近日志 */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs">最近定时日志</Label>
                {loadingLogs ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> 加载中...
                  </div>
                ) : scheduleLogs.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {scheduleLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-1.5 text-[10px]">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-[3px] ${
                          log.status === "enabled" ? "bg-emerald-400" : log.status === "ok" ? "bg-blue-400" : log.status === "success" ? "bg-green-500" : "bg-red-500"
                        }`} />
                        <span className="text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                        {log.type && log.type !== "manual" && (
                          <span className="px-1 py-0.5 rounded bg-muted text-[9px] text-muted-foreground shrink-0">{log.type}</span>
                        )}
                        <span className="text-muted-foreground break-all">{log.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">暂无定时日志</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">请先在上方点击「启用备份」选择一个仓库</p>
          )}
        </div>
      )}
    </div>
  );
}
