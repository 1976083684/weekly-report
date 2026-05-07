"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Globe } from "lucide-react";
import { BackupConfigForm } from "@/components/backup/BackupConfigForm";

interface BackupConfig {
  id: string;
  provider: string;
  repoUrl: string;
  branch: string;
  path: string;
  hasToken?: boolean;
}

export default function BackupPage() {
  const [configs, setConfigs] = useState<BackupConfig[]>([]);

  const fetchData = async () => {
    const res = await fetch("/api/backup/config");
    if (res.ok) {
      const data = await res.json();
      setConfigs(data.configs || []);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        返回设置
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">备份配置</h1>

      <section className="space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" /> Git 仓库备份
        </h2>
        <BackupConfigForm
          key={configs.find((c) => c.provider === "github")?.id || "github-new"}
          provider="github"
          initialData={configs.find((c) => c.provider === "github") || null}
          onSuccess={fetchData}
        />
        <BackupConfigForm
          key={configs.find((c) => c.provider === "gitee")?.id || "gitee-new"}
          provider="gitee"
          initialData={configs.find((c) => c.provider === "gitee") || null}
          onSuccess={fetchData}
        />
      </section>
    </div>
  );
}
