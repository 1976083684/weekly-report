"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wand2,
  List,
  ToggleLeft,
  ToggleRight,
  Gauge,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface ModelData {
  id: string;
  provider: string;
  modelName: string;
  baseUrl: string;
  website?: string;
  notes?: string;
  haikuModel?: string | null;
  sonnetModel?: string | null;
  opusModel?: string | null;
  configJson?: string | null;
  isActive: boolean;
  hasKey: boolean;
}

const DEFAULT_USAGE_BLOCK = `({
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

function parseUsageFromConfig(configJson: string | null | undefined) {
  const defaults = {
    enabled: false,
    block: DEFAULT_USAGE_BLOCK,
    timeout: 10,
    interval: 5,
  };
  if (!configJson) return defaults;
  try {
    const obj = JSON.parse(configJson);
    const uc = obj.usageCheck;
    if (!uc) return defaults;
    return {
      enabled: uc.enabled ?? defaults.enabled,
      block: uc.block ?? defaults.block,
      timeout: uc.timeout ?? defaults.timeout,
      interval: uc.interval ?? defaults.interval,
    };
  } catch {
    return defaults;
  }
}

function parseUsageBlock(block: string) {
  try {
    const fn = new Function(`"use strict"; return ${block};`);
    return fn();
  } catch {
    return null;
  }
}

export default function ModelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [model, setModel] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);

  const [provider, setProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [mainModel, setMainModel] = useState("");
  const [haikuModel, setHaikuModel] = useState("");
  const [sonnetModel, setSonnetModel] = useState("");
  const [opusModel, setOpusModel] = useState("");
  const [rawConfigJson, setRawConfigJson] = useState("");

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [showConfigJson, setShowConfigJson] = useState(false);

  const [showKey, setShowKey] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelList, setModelList] = useState<string[]>([]);
  const [modelListError, setModelListError] = useState("");
  const [showModelList, setShowModelList] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});

  // Usage check
  const [usageEnabled, setUsageEnabled] = useState(false);
  const [usageBlock, setUsageBlock] = useState(DEFAULT_USAGE_BLOCK);
  const [usageTimeout, setUsageTimeout] = useState(10);
  const [usageInterval, setUsageInterval] = useState(5);
  const [usageTesting, setUsageTesting] = useState(false);
  const [usageTestResult, setUsageTestResult] = useState<{
    ok: boolean;
    text: string;
    raw?: string;
  } | null>(null);

  const loadModel = async () => {
    const res = await fetch("/api/settings/models");
    const data = await res.json();
    const found = (data.models || []).find((m: ModelData) => m.id === id);
    if (found) {
      setModel(found);
      setProvider(found.provider);
      setBaseUrl(found.baseUrl);
      setWebsite(found.website || "");
      setNotes(found.notes || "");
      setMainModel(found.modelName || "");
      setHaikuModel(found.haikuModel || "");
      setSonnetModel(found.sonnetModel || "");
      setOpusModel(found.opusModel || "");
      setRawConfigJson(found.configJson || "");

      // 从数据库读取已保存的 API Key
      try {
        const keyRes = await fetch(`/api/settings/models/${id}/key`);
        const keyData = await keyRes.json();
        if (keyData.apiKey) {
          setApiKey(keyData.apiKey);
        }
      } catch { /* 忽略读取失败 */ }

      const uc = parseUsageFromConfig(found.configJson);
      setUsageEnabled(uc.enabled);
      setUsageBlock(uc.block);
      setUsageTimeout(uc.timeout);
      setUsageInterval(uc.interval);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadModel();
  }, [id]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-model-dropdown]")) {
        setDropdownOpen({});
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const buildConfigJson = (): string => {
    let obj: Record<string, unknown> = {};
    if (rawConfigJson) {
      try {
        obj = JSON.parse(rawConfigJson);
      } catch { /* keep as-is */ }
    }
    const existingUc = (obj.usageCheck || {}) as Record<string, unknown>;
    obj.usageCheck = {
      ...existingUc,
      enabled: usageEnabled,
      block: usageBlock,
      timeout: usageTimeout,
      interval: usageInterval,
    };
    return JSON.stringify(obj);
  };

  const handleSave = async () => {
    setSaving(true);
    const body: Record<string, unknown> = {
      provider,
      modelName: mainModel,
      baseUrl,
      website: website || null,
      notes: notes || null,
      haikuModel: haikuModel || null,
      sonnetModel: sonnetModel || null,
      opusModel: opusModel || null,
      configJson: buildConfigJson(),
    };
    if (apiKey) {
      body.apiKey = apiKey;
    }

    const res = await fetch(`/api/settings/models/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/settings/models");
    } else {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/settings/models/${id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult({ ok: data.success, text: data.success ? data.reply : data.error });
    } catch {
      setTestResult({ ok: false, text: "网络请求失败" });
    }
    setTesting(false);
  };

  const handleDelete = async () => {
    if (!confirm(`确定删除模型「${provider} ${mainModel}」？`)) return;
    await fetch(`/api/settings/models/${id}`, { method: "DELETE" });
    router.push("/settings/models");
  };

  const fetchModelList = async () => {
    setFetchingModels(true);
    setModelListError("");
    setModelList([]);
    try {
      const res = await fetch(`/api/settings/models/${id}/list-models`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setModelList(data.models || []);
        setShowModelList(true);
      } else {
        setModelListError(data.error || "获取失败");
      }
    } catch {
      setModelListError("该供应商不支持获取模型列表");
    }
    setFetchingModels(false);
  };

  const autoFillModels = async () => {
    setFetchingModels(true);
    setModelListError("");
    try {
      const res = await fetch(`/api/settings/models/${id}/list-models`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.models.length > 0) {
        const list: string[] = data.models;
        setModelList(list);
        const haiku = list.find((m: string) => /haiku/i.test(m)) || list[0];
        const sonnet = list.find((m: string) => /sonnet/i.test(m)) || list[0];
        const opus = list.find((m: string) => /opus/i.test(m)) || list[0];
        setMainModel(list[0]);
        setHaikuModel(haiku);
        setSonnetModel(sonnet);
        setOpusModel(opus);
      } else {
        setModelListError(data.error || "该供应商不支持获取模型列表");
      }
    } catch {
      setModelListError("该供应商不支持获取模型列表");
    }
    setFetchingModels(false);
  };

  const toggleDropdown = (field: string) => {
    setDropdownOpen((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const selectModel = (field: string, value: string) => {
    switch (field) {
      case "main": setMainModel(value); break;
      case "haiku": setHaikuModel(value); break;
      case "sonnet": setSonnetModel(value); break;
      case "opus": setOpusModel(value); break;
    }
    setDropdownOpen({});
  };

  const handleUsageTest = async () => {
    const parsed = parseUsageBlock(usageBlock);
    if (!parsed) {
      setUsageTestResult({ ok: false, text: "配置格式解析失败，请检查语法" });
      return;
    }
    const req = parsed.request || {};
    const extractorStr = parsed.extractor;
    if (!extractorStr || typeof extractorStr !== "function") {
      setUsageTestResult({ ok: false, text: "提取器必须为函数" });
      return;
    }

    setUsageTesting(true);
    setUsageTestResult(null);
    try {
      const res = await fetch(`/api/settings/models/${id}/usage-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: req.url || "",
          method: req.method || "GET",
          headers: req.headers || {},
          extractor: extractorStr.toString(),
          timeout: usageTimeout,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUsageTestResult({
          ok: true,
          text: `剩余额度: ${data.result.remaining} ${data.result.unit}`.trim(),
          raw: data.rawResponse,
        });
        setUsageEnabled(true);
        // 同步更新 rawConfigJson
        try {
          const configObj = rawConfigJson ? JSON.parse(rawConfigJson) : {};
          const uc = (configObj.usageCheck || {}) as Record<string, unknown>;
          uc.enabled = true;
          uc.block = usageBlock;
          uc.lastChecked = new Date().toISOString();
          uc.lastRemaining = data.result.remaining;
          uc.lastUnit = data.result.unit;
          uc.lastError = null;
          configObj.usageCheck = uc;
          setRawConfigJson(JSON.stringify(configObj));
        } catch { /* ignore */ }
      } else {
        setUsageTestResult({ ok: false, text: data.error, raw: data.rawResponse });
      }
    } catch {
      setUsageTestResult({ ok: false, text: "网络请求失败" });
    }
    setUsageTesting(false);
  };

  const modelFieldDefs = [
    { key: "main", label: "主模型", value: mainModel, setter: setMainModel },
    { key: "haiku", label: "Haiku 默认模型", value: haikuModel, setter: setHaikuModel },
    { key: "sonnet", label: "Sonnet 默认模型", value: sonnetModel, setter: setSonnetModel },
    { key: "opus", label: "Opus 默认模型", value: opusModel, setter: setOpusModel },
  ];

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center text-sm text-muted-foreground">加载中...</div>
    );
  }

  if (!model) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center text-sm text-muted-foreground">模型不存在</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/settings/models"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回模型列表
        </Link>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="h-8 px-2 text-muted-foreground hover:text-danger">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <h1 className="text-2xl font-semibold text-foreground">编辑模型配置</h1>

      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        {/* 供应商 | 备注 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">供应商</label>
            <Input value={provider} onChange={(e) => setProvider(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">备注</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="例如：个人专用" className="h-9 text-sm" />
          </div>
        </div>

        {/* 官网地址 */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">官网地址</label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="h-9 text-sm" />
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">API Key</label>
          <div className="relative">
            <Input
              value={showKey ? apiKey : (apiKey ? "••••••••" : "")}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="只需要填这里，下方会自动配置"
              type={showKey ? "text" : "password"}
              className="h-9 text-sm pr-10"
            />
            {apiKey && (
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground transition-colors"
                title={showKey ? "隐藏" : "显示"}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* 请求地址 */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">请求地址 (Base URL)</label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="h-9 text-sm" />
        </div>

        <Separator />

        {/* 模型映射 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">模型映射</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={autoFillModels} disabled={fetchingModels} className="h-8 text-xs">
                {fetchingModels ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1" />}
                一键设置
              </Button>
              <Button variant="outline" size="sm" onClick={fetchModelList} disabled={fetchingModels} className="h-8 text-xs">
                {fetchingModels ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <List className="w-3.5 h-3.5 mr-1" />}
                获取模型列表
              </Button>
            </div>
          </div>

          {modelListError && <p className="text-xs text-danger mb-2">{modelListError}</p>}

          <div className="grid grid-cols-2 gap-3">
            {modelFieldDefs.map((field) => (
              <div key={field.key} className="space-y-1.5" data-model-dropdown>
                <label className="text-xs text-muted-foreground">{field.label}</label>
                <div className="relative">
                  <div className="flex items-center gap-1">
                    <Input value={field.value} onChange={(e) => field.setter(e.target.value)} className="h-9 text-sm flex-1" />
                    {showModelList && modelList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleDropdown(field.key)}
                        className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen[field.key] ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                  {dropdownOpen[field.key] && modelList.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 left-0 right-0 max-h-48 overflow-auto rounded-lg border border-border bg-card shadow-lg">
                      {modelList.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => selectModel(field.key, m)}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${
                            field.value === m ? "bg-primary/10 text-primary" : ""
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 配置 JSON (可折叠) */}
        <div>
          <button
            type="button"
            onClick={() => setShowConfigJson(!showConfigJson)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfigJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            配置 JSON
          </button>
          {showConfigJson && (
            <textarea
              value={rawConfigJson}
              onChange={(e) => setRawConfigJson(e.target.value)}
              rows={8}
              className="mt-2 w-full rounded-lg border border-border bg-muted/50 p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder='{"env": {...}}'
            />
          )}
        </div>

        <Separator />

        {/* 用量查询 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-muted-foreground" />
              用量查询
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleUsageTest} disabled={usageTesting} className="h-8 text-xs">
                {usageTesting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                测试
              </Button>
              <button
                type="button"
                onClick={() => setUsageEnabled(!usageEnabled)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title={usageEnabled ? "关闭" : "开启"}
              >
                {usageEnabled ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                开启
              </button>
            </div>
          </div>

          {/* 配置编辑块 */}
          <div className="space-y-1 mb-3">
            <label className="text-[11px] text-muted-foreground">配置（支持 {"{{baseUrl}}"} 和 {"{{apiKey}}"} 模板变量）</label>
            <textarea
              value={usageBlock}
              onChange={(e) => setUsageBlock(e.target.value)}
              rows={16}
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-muted/50 p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Timeout & Interval */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">超时时间（秒）</label>
              <Input
                type="number" min={1} max={60}
                value={usageTimeout}
                onChange={(e) => setUsageTimeout(Number(e.target.value) || 10)}
                className="h-8 text-sm w-24"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">自动查询间隔（分钟，0=不自动查询）</label>
              <Input
                type="number" min={0} max={1440}
                value={usageInterval}
                onChange={(e) => setUsageInterval(Number(e.target.value) || 0)}
                className="h-8 text-sm w-24"
              />
            </div>
          </div>

          {usageTestResult && (
            <div
              className={`p-2.5 rounded-lg text-xs ${
                usageTestResult.ok
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-danger/10 text-danger border border-danger/20"
              }`}
            >
              <p className="font-medium mb-0.5">{usageTestResult.ok ? "✅ 测试通过" : "❌ 测试失败"}</p>
              <p>{usageTestResult.text}</p>
              {usageTestResult.raw && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">原始响应</summary>
                  <pre className="mt-1 whitespace-pre-wrap">{usageTestResult.raw}</pre>
                </details>
              )}
            </div>
          )}
        </div>

        <Separator />

        {testResult && (
          <div
            className={`p-2.5 rounded-lg text-xs ${
              testResult.ok ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"
            }`}
          >
            {testResult.ok ? "✅ 测试通过 —— " : "❌ "}
            {testResult.text}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            保存
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
            测试连接
          </Button>
        </div>
      </div>
    </div>
  );
}
