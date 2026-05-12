"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GitConfig {
  id: string;
  provider: string;
  repoUrl: string;
  branch: string;
  path: string;
}

function GitImportSection({
  provider,
  label,
  config,
  loading,
}: {
  provider: string;
  label: string;
  config: GitConfig | null;
  loading: boolean;
}) {
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState("");

  const handleImport = async () => {
    if (!config) return;
    setImporting(true);
    setMsg("");
    try {
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: config.id, scope: "all" }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.details || data.message);
      } else {
        setMsg(`导入失败：${data.error}`);
      }
    } catch {
      setMsg("网络错误，请稍后重试");
    }
    setImporting(false);
  };

  return (
    <section className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h2 className="font-medium text-sm flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-muted-foreground" /> 从 {label} 导入
      </h2>
      <p className="text-xs text-muted-foreground">
        从已配置的 {label} 备份仓库中拉取备份文件并导入到本地。需先在"备份设置"中配置 {label} 备份。
      </p>
      {loading ? (
        <p className="text-xs text-muted-foreground">加载配置中...</p>
      ) : !config ? (
        <p className="text-xs text-amber-500">
          未检测到 {label} 备份配置，请先在
          <Link href="/settings/backup" className="underline mx-0.5">备份设置</Link>
          中配置。
        </p>
      ) : (
        <>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>仓库：{config.repoUrl}</p>
            <p>分支：{config.branch}　路径：{config.path}</p>
          </div>
          <Button
            onClick={handleImport}
            disabled={importing}
            variant="outline"
            size="sm"
          >
            {importing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            从 {label} 拉取导入
          </Button>
          {msg && (
            <p className={`text-xs ${msg.includes("失败") || msg.includes("错误") ? "text-danger" : "text-success"}`}>
              {msg}
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default function ImportExportPage() {
  // JSON Import/Export
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  // Git reverse import
  const [gitConfigs, setGitConfigs] = useState<GitConfig[]>([]);
  const [gitLoading, setGitLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backup/config")
      .then((r) => r.json())
      .then((data) => {
        setGitConfigs(data.configs || []);
        setGitLoading(false);
      })
      .catch(() => setGitLoading(false));
  }, []);

  const handleExport = () => {
    window.open("/api/settings/export", "_blank");
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportMsg("请先选择 JSON 文件");
      return;
    }
    setImporting(true);
    setImportMsg("");
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch("/api/settings/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setImportMsg(data.message);
        setImportFile(null);
        const input = document.getElementById("import-file-input") as HTMLInputElement;
        if (input) input.value = "";
      } else {
        setImportMsg(`导入失败：${data.error}`);
      }
    } catch {
      setImportMsg("导入失败");
    }
    setImporting(false);
  };

  const githubConfig = gitConfigs.find((c) => c.provider === "github") || null;
  const giteeConfig = gitConfigs.find((c) => c.provider === "gitee") || null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        返回设置
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">导入导出</h1>

      {/* Export */}
      <section className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <Download className="w-4 h-4 text-muted-foreground" /> 数据导出
        </h2>
        <p className="text-xs text-muted-foreground">将所有日记、周报、标签、备份配置、AI模型配置导出为 JSON 文件</p>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          导出数据
        </Button>
      </section>

      {/* JSON Import */}
      <section className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <Upload className="w-4 h-4 text-muted-foreground" /> 数据导入
        </h2>
        <p className="text-xs text-muted-foreground">
          导入之前导出的 JSON 文件。标签合并，日记/周报按日期+标题去重，备份配置和模型配置按唯一键更新或新增。
        </p>
        <div className="flex gap-2 items-center">
          <Input
            id="import-file-input"
            type="file"
            accept=".json"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="h-9 text-sm flex-1"
          />
          <Button onClick={handleImport} disabled={importing || !importFile} variant="outline" size="sm">
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
            导入数据
          </Button>
        </div>
        {importMsg && (
          <p className={`text-xs ${importMsg.startsWith("导入失败") || importMsg.startsWith("请") ? "text-danger" : "text-success"}`}>
            {importMsg}
          </p>
        )}
      </section>

      {/* GitHub Reverse Import */}
      <GitImportSection
        provider="github"
        label="GitHub"
        config={githubConfig}
        loading={gitLoading}
      />

      {/* Gitee Reverse Import */}
      <GitImportSection
        provider="gitee"
        label="Gitee"
        config={giteeConfig}
        loading={gitLoading}
      />
    </div>
  );
}
