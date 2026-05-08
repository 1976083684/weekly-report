"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  Loader2,
  Cpu,
  AlertCircle,
  ExternalLink,
  Settings2,
  Check,
  Pencil,
  Copy,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRESET_LIST, PRESET_MODELS } from "@/lib/preset-models";

interface UsageBalance {
  enabled: boolean;
  lastChecked: string | null;
  remaining: string;
  unit: string;
  error: string | null;
}

interface ModelData {
  id: string;
  provider: string;
  modelName: string;
  baseUrl: string;
  website?: string;
  notes?: string;
  isActive: boolean;
  hasKey: boolean;
  configJson?: string | null;
  usageBalance?: UsageBalance | null;
  createdAt: string;
  updatedAt: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  function timeAgo(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  }

  const fetchModels = async () => {
    const res = await fetch("/api/settings/models");
    const data = await res.json();
    setModels(data.models || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const addPresetModel = async (presetKey: string) => {
    const preset = PRESET_MODELS[presetKey];
    if (!preset) return;
    setAdding(true);
    setAddError("");

    const res = await fetch("/api/settings/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: preset.provider,
        modelName: preset.modelName,
        apiKey: "",
        baseUrl: preset.baseUrl,
        website: preset.website,
        notes: preset.notes,
        haikuModel: preset.haikuModel,
        sonnetModel: preset.sonnetModel,
        opusModel: preset.opusModel,
        configJson: preset.configJson,
      }),
    });
    const data = await res.json();
    if (data.error) {
      setAddError(data.error);
    } else {
      setShowPresets(false);
      fetchModels();
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await fetch(`/api/settings/models/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    fetchModels();
  };

  const deleteModel = async (id: string, name: string) => {
    if (!confirm(`确定删除模型「${name}」？`)) return;
    await fetch(`/api/settings/models/${id}`, { method: "DELETE" });
    fetchModels();
  };

  const refreshBalance = async (id: string) => {
    setRefreshingId(id);
    const model = models.find((m) => m.id === id);
    if (!model) { setRefreshingId(null); return; }

    const res = await fetch("/api/settings/models");
    const data = await res.json();
    const full = (data.models || []).find((m: ModelData) => m.id === id);
    let uc: { block?: string; timeout?: number } = {};
    try {
      if (full?.configJson) {
        const obj = JSON.parse(full.configJson as unknown as string);
        uc = obj.usageCheck || {};
      }
    } catch { /* ignore */ }

    const DEFAULT_FALLBACK_BLOCK = `({
  request: {
    url: "{{baseUrl}}/user/balance",
    method: "GET",
    headers: {
      "Authorization": "Bearer {{apiKey}}",
      "User-Agent": "cc-switch/1.0"
    }
  },
  extractor: function(response) {
    var info = (response.balance_infos && response.balance_infos[0]) || {};
    return {
      remaining: info.total_balance || response.total_balance || response.balance || "",
      unit: info.currency || response.unit || ""
    };
  }
})`;

    const block = uc.block || DEFAULT_FALLBACK_BLOCK;
    let parsed: { request?: { url?: string; method?: string; headers?: Record<string, string> }; extractor?: unknown } = {};
    try {
      const fn = new Function(`"use strict"; return ${block};`);
      parsed = fn();
    } catch { /* ignore */ }

    const req = parsed.request || {};
    const extractorStr = typeof parsed.extractor === "function" ? parsed.extractor.toString() : "";

    await fetch(`/api/settings/models/${id}/usage-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: req.url || "",
        method: req.method || "GET",
        headers: req.headers || {},
        extractor: extractorStr,
        timeout: uc.timeout || 10,
        saveResult: true,
      }),
    });
    fetchModels();
    setRefreshingId(null);
  };

  const testModel = async (id: string) => {
    setTestingId(id);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch(`/api/settings/models/${id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: data.success, text: data.success ? data.reply : data.error },
      }));
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { ok: false, text: "网络请求失败" } }));
    }
    setTestingId(null);
  };

  const copyModelConfig = async (model: ModelData) => {
    setCopiedId(model.id);
    await fetch(`/api/settings/models/${model.id}/copy`, { method: "POST" });
    fetchModels();
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回设置
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">模型配置</h1>
        <Button size="sm" onClick={() => setShowPresets(!showPresets)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          添加模型
        </Button>
      </div>

      {showPresets && (
        <section className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h2 className="font-medium text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" /> 选择预设模型
          </h2>
          <p className="text-xs text-muted-foreground">
            选择一个预设模型将自动填充供应商、模型映射和配置信息，只需填写 API Key 即可使用。
          </p>
          <div className="grid gap-3">
            {PRESET_LIST.map((preset) => (
              <div
                key={preset.key}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors bg-muted/30"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{preset.provider}</span>
                    <span className="text-xs text-muted-foreground">{preset.modelName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{preset.notes}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => addPresetModel(preset.key)}
                  disabled={adding}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  添加
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowPresets(false);
                setShowAdd(!showAdd);
              }}
              className="text-xs"
            >
              <Settings2 className="w-3.5 h-3.5 mr-1" />
              手动配置其他模型
            </Button>
          </div>
        </section>
      )}

      {showAdd && (
        <section className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h2 className="font-medium text-sm">手动添加模型</h2>
          <p className="text-xs text-muted-foreground">请通过预设模型添加，或联系管理员。</p>
        </section>
      )}

      {addError && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {addError}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm text-center py-8">加载中...</p>
      ) : models.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          暂无模型配置，点击「添加模型」开始
        </p>
      ) : (
        <div className="space-y-3">
          {models.map((model) => {
            const testResult = testResults[model.id];
            return (
              <div
                key={model.id}
                className={`bg-card rounded-xl border transition-colors ${
                  model.isActive ? "border-primary/40" : "border-border"
                } p-4 space-y-3`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{model.provider}</h3>
                      <span className="text-xs text-muted-foreground font-mono">
                        {model.modelName}
                      </span>
                    </div>
                    {model.notes && (
                      <p className="text-xs text-muted-foreground">{model.notes}</p>
                    )}
                    {model.website && (
                      <a
                        href={model.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {model.website}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {model.usageBalance?.enabled && (
                      <div className="flex flex-col items-end text-xs mr-2">
                        {/* 第一行：时间与刷新 */}
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">
                            {model.usageBalance.lastChecked ? timeAgo(model.usageBalance.lastChecked) : "未查询"}
                          </span>
                          <button
                            type="button"
                            onClick={() => refreshBalance(model.id)}
                            disabled={refreshingId === model.id}
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                            title="刷新余额"
                          >
                            <RefreshCw className={`w-3 h-3 ${refreshingId === model.id ? "animate-spin" : ""}`} />
                          </button>
                        </div>
                        {/* 第二行：余额数值 */}
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">剩余</span>
                          {model.usageBalance.remaining ? (
                            <span className="text-success font-medium">
                              {model.usageBalance.remaining}{model.usageBalance.unit ? ` ${model.usageBalance.unit}` : ""}
                            </span>
                          ) : model.usageBalance.error ? (
                            <span className="text-danger">检查配置</span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </div>
                      </div>
                    )}
                    {model.isActive ? (
                      <button
                        disabled
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground cursor-not-allowed"
                      >
                        <Check className="w-3.5 h-3.5" />
                        使用中
                      </button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => toggleActive(model.id, model.isActive)}
                        className="h-8 text-xs"
                      >
                        启用此模型
                      </Button>
                    )}
                    <Link
                      href={`/settings/models/${model.id}`}
                      className="inline-flex items-center justify-center h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => copyModelConfig(model)}
                      className="inline-flex items-center justify-center h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="复制配置"
                    >
                      {copiedId === model.id ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testModel(model.id)}
                      disabled={testingId === model.id}
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                      title="测试连接"
                    >
                      {testingId === model.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteModel(model.id, `${model.provider} ${model.modelName}`)}
                      className="h-8 px-2 text-muted-foreground hover:text-danger"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs ${
                      testResult.ok
                        ? "bg-success/10 text-success border border-success/20"
                        : "bg-danger/10 text-danger border border-danger/20"
                    }`}
                  >
                    {testResult.ok ? "✅ 测试通过 —— " : "❌ "}
                    {testResult.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
