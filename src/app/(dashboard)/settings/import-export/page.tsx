"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ImportExportPage() {
  // Import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

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

      {/* Import */}
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
    </div>
  );
}
