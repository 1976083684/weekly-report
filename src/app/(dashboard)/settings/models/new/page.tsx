"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Play,
  ChevronDown,
  ChevronUp,
  Wand2,
  List,
  Eye,
  EyeOff,
  Cpu,
  Check,
  ToggleLeft,
  ToggleRight,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { PRESET_MODELS, type PresetModel } from "@/lib/preset-models";

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

const PROVIDER_KEYS = ["deepseek", "zhipu"] as const;

function applyPresetToForm(preset: PresetModel) {
  return {
    provider: preset.provider,
    modelName: preset.modelName,
    baseUrl: preset.baseUrl,
    website: preset.website,
    notes: preset.notes,
    haikuModel: preset.haikuModel,
    sonnetModel: preset.sonnetModel,
    opusModel: preset.opusModel,
    configJson: preset.configJson,
  };
}

function NewModelForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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

  function parseUsageFromConfig(configJson: string | null | undefined) {
    const defaults = { enabled: false, block: DEFAULT_USAGE_BLOCK, timeout: 10, interval: 5 };
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
    } catch { return defaults; }
  }

  function parseUsageBlock(block: string) {
    try {
      const fn = new Function(`"use strict"; return ${block};`);
      return fn();
    } catch { return null; }
  }

  const selectProvider = (key: string) => {
    const preset = PRESET_MODELS[key];
    if (!preset) return;
    setSelectedKey(key);
    const values = applyPresetToForm(preset);
    setProvider(values.provider);
    setMainModel(values.modelName);
    setBaseUrl(values.baseUrl);
    setWebsite(values.website);
    setNotes(values.notes);
    setHaikuModel(values.haikuModel);
    setSonnetModel(values.sonnetModel);
    setOpusModel(values.opusModel);
    setRawConfigJson(values.configJson);
    setTestResult(null);
    setModelList([]);
    setModelListError("");
    // 从预设配置中解析 usageCheck
    const uc = parseUsageFromConfig(values.configJson);
    setUsageEnabled(uc.enabled);
    setUsageBlock(uc.block);
    setUsageTimeout(uc.timeout);
    setUsageInterval(uc.interval);
    setUsageTestResult(null);
  };

  // 如果 URL 带有 ?provider=deepseek 或 ?provider=zhipu，自动选中
  useEffect(() => {
    const providerParam = searchParams.get("provider");
    if (providerParam && PRESET_MODELS[providerParam]) {
      selectProvider(providerParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const buildConfigJson = (): string => {
    let obj: Record<string, unknown> = {};
    if (rawConfigJson) {
      try { obj = JSON.parse(rawConfigJson); } catch { /* keep */ }
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
    if (!provider || !mainModel || !baseUrl) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      provider,
      modelName: mainModel,
      apiKey,
      baseUrl,
      website: website || null,
      notes: notes || null,
      haikuModel: haikuModel || null,
      sonnetModel: sonnetModel || null,
      opusModel: opusModel || null,
      configJson: buildConfigJson(),
    };

    const res = await fetch("/api/settings/models", {
      method: "POST",
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
    if (!baseUrl || !apiKey || !mainModel) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey, modelName: mainModel }),
      });
      const data = await res.json();
      setTestResult({ ok: data.success, text: data.success ? data.reply : data.error });
    } catch {
      setTestResult({ ok: false, text: "网络请求失败" });
    }
    setTesting(false);
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
      const res = await fetch("/api/settings/models/test-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: req.url || "",
          method: req.method || "GET",
          headers: req.headers || {},
          extractor: extractorStr.toString(),
          timeout: usageTimeout,
          baseUrl,
          apiKey,
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
      } else {
        setUsageTestResult({ ok: false, text: data.error, raw: data.rawResponse });
      }
    } catch {
      setUsageTestResult({ ok: false, text: "网络请求失败" });
    }
    setUsageTesting(false);
  };

  const fetchModelList = async () => {
    if (!baseUrl || !apiKey) {
      setModelListError("请先填写 API Key 和请求地址");
      return;
    }
    setFetchingModels(true);
    setModelListError("");
    setModelList([]);
    try {
      const resp = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const list: string[] = (data.data || []).map((m: { id: string }) => m.id).filter(Boolean);
      if (list.length > 0) {
        setModelList(list);
      } else {
        setModelListError("该接口未返回模型列表");
      }
    } catch {
      setModelListError("该供应商不支持获取模型列表");
    }
    setFetchingModels(false);
  };

  const autoFillModels = async () => {
    if (!baseUrl || !apiKey) {
      setModelListError("请先填写 API Key 和请求地址");
      return;
    }
    setFetchingModels(true);
    setModelListError("");
    try {
      const resp = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const list: string[] = (data.data || []).map((m: { id: string }) => m.id).filter(Boolean);
      if (list.length > 0) {
        setModelList(list);
        const haiku = list.find((m: string) => /haiku/i.test(m)) || list[0];
        const sonnet = list.find((m: string) => /sonnet/i.test(m)) || list[0];
        const opus = list.find((m: string) => /opus/i.test(m)) || list[0];
        setMainModel(list[0]);
        setHaikuModel(haiku);
        setSonnetModel(sonnet);
        setOpusModel(opus);
      } else {
        setModelListError("该接口未返回模型列表");
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

  const modelFieldDefs = [
    { key: "main", label: "主模型", value: mainModel, setter: setMainModel },
    { key: "haiku", label: "Haiku 默认模型", value: haikuModel, setter: setHaikuModel },
    { key: "sonnet", label: "Sonnet 默认模型", value: sonnetModel, setter: setSonnetModel },
    { key: "opus", label: "Opus 默认模型", value: opusModel, setter: setOpusModel },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/settings/models"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回模型列表
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">添加模型</h1>

      {/* 供应商选择 */}
      <section className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <Cpu className="w-4 h-4 text-muted-foreground" /> 选择供应商
        </h2>
        <p className="text-xs text-muted-foreground">
          选择一个预设供应商将自动填充模型映射和配置信息，只需填写 API Key 即可使用。
        </p>
        <div className="grid grid-cols-2 gap-3">
          {PROVIDER_KEYS.map((key) => {
            const preset = PRESET_MODELS[key];
            const isSelected = selectedKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectProvider(key)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30 bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{preset.provider}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{preset.modelName}</p>
                <p className="text-xs text-muted-foreground mt-1">{preset.notes}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 配置表单（选择供应商后显示） */}
      {selectedKey && (
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
                placeholder="只需填这里，下方会自动配置"
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
                      {modelList.length > 0 && (
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

          {/* 配置 JSON（可折叠） */}
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
      )}
    </div>
  );
}

export default function NewModelPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto py-8 text-center text-sm text-muted-foreground">加载中...</div>}>
      <NewModelForm />
    </Suspense>
  );
}
