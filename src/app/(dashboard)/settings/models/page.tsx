"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  Check,
  Loader2,
  Cpu,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Settings2,
  Power,
  PowerOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { PRESET_LIST, PRESET_MODELS } from "@/lib/preset-models";

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
  createdAt: string;
  updatedAt: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState(true);

  // Preset selection
  const [showPresets, setShowPresets] = useState(false);

  // Add form (manual)
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Test states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; text: string }>>({});

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editApiKey, setEditApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  // Expand config
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        apiKey: "placeholder", // 后续通过修改 API Key 设置
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

  const saveApiKey = async (id: string) => {
    setSaving(true);
    await fetch(`/api/settings/models/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: editApiKey }),
    });
    setEditingId(null);
    setEditApiKey("");
    setSaving(false);
    fetchModels();
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    if (currentActive) {
      // 取消激活
      await fetch(`/api/settings/models/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
    } else {
      await fetch(`/api/settings/models/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
    }
    fetchModels();
  };

  const deleteModel = async (id: string, name: string) => {
    if (!confirm(`确定删除模型「${name}」？`)) return;
    await fetch(`/api/settings/models/${id}`, { method: "DELETE" });
    fetchModels();
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

      {/* Preset selection */}
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

      {/* Manual add form */}
      {showAdd && (
        <section className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h2 className="font-medium text-sm">手动添加模型</h2>
          {/* Manual form omitted for brevity - using preset is the primary flow */}
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
            const isExpanded = expandedId === model.id;
            const testResult = testResults[model.id];
            return (
              <div
                key={model.id}
                className={`bg-card rounded-xl border transition-colors ${
                  model.isActive ? "border-primary/40" : "border-border"
                } p-4 space-y-3`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">
                        {model.provider}
                      </h3>
                      <span className="text-xs text-muted-foreground font-mono">
                        {model.modelName}
                      </span>
                      {model.isActive ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-success/10 text-success text-xs inline-flex items-center gap-1">
                          <Power className="w-3 h-3" /> 已启用
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-xs inline-flex items-center gap-1">
                          <PowerOff className="w-3 h-3" /> 未启用
                        </span>
                      )}
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
                  <div className="flex items-center gap-1">
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

                {/* Test result */}
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

                {/* Model mapping */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">Haiku</span>
                    <p className="font-mono mt-0.5 text-foreground">
                      {model.haikuModel || "-"}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">Sonnet</span>
                    <p className="font-mono mt-0.5 text-foreground">
                      {model.sonnetModel || "-"}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">Opus</span>
                    <p className="font-mono mt-0.5 text-foreground">
                      {model.opusModel || "-"}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* API Key */}
                  {editingId === model.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={editApiKey}
                        onChange={(e) => setEditApiKey(e.target.value)}
                        placeholder="输入 API Key"
                        type="password"
                        className="h-8 w-56 text-xs"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => saveApiKey(model.id)}
                        disabled={saving}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        className="h-8 px-2 text-xs"
                      >
                        取消
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(model.id);
                        setEditApiKey("");
                      }}
                      className="h-8 text-xs"
                    >
                      {model.hasKey ? "修改 API Key" : "设置 API Key"}
                    </Button>
                  )}

                  <Button
                    variant={model.isActive ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleActive(model.id, model.isActive)}
                    className="h-8 text-xs"
                  >
                    {model.isActive ? "停用" : "启用此模型"}
                  </Button>

                  {/* Expand config */}
                  {model.configJson && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : model.id)}
                      className="h-8 text-xs text-muted-foreground"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 mr-1" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 mr-1" />
                      )}
                      配置 JSON
                    </Button>
                  )}
                </div>

                {/* Config JSON (expandable) */}
                {isExpanded && model.configJson && (
                  <div className="bg-muted/50 rounded-lg p-3 overflow-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(model.configJson), null, 2);
                        } catch {
                          return model.configJson;
                        }
                      })()}
                    </pre>
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
