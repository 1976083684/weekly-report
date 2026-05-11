"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Lock,
  Globe,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Cpu,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface UserData {
  id: string;
  email: string;
  name: string;
  image?: string;
  accounts: { provider: string; providerAccountId: string }[];
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);

  // Delete
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setUser(data.user));
  }, []);

  const isOAuthBound = (provider: string) =>
    user?.accounts?.some((a) => a.provider === provider);

  const handleDelete = async () => {
    setDeleteMsg("");
    const res = await fetch("/api/settings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: deleteInput }),
    });
    const data = await res.json();
    if (data.success) {
      await signOut({ callbackUrl: "/login" });
    } else {
      setDeleteMsg(data.error || "操作失败");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">设置</h1>

      {/* Navigation to sub-pages */}
      <div className="space-y-2">
        <Link
          href="/settings/account"
          className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            我的信息
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link
          href="/settings/password"
          className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            修改密码
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link
          href="/settings/backup"
          className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            备份配置
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link
          href="/settings/models"
          className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            模型配置
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link
          href="/settings/prompts"
          className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            提示词配置
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link
          href="/settings/import-export"
          className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <Download className="w-4 h-4 text-muted-foreground" />
            导入导出
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Delete Account */}
      <section className="bg-card rounded-xl border border-danger/30 p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-2 text-danger">
          <Trash2 className="w-4 h-4" /> 删除账号
        </h2>
        <div className="p-3 rounded-lg bg-danger/5 border border-danger/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">
            删除账号将永久删除所有日记、周报、标签和备份配置。此操作不可撤销。
          </p>
        </div>
        <div className="space-y-2">
          <Input
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder='输入"确认删除"确认操作'
            className="h-9 text-sm"
          />
          <Button
            onClick={handleDelete}
            variant="destructive"
            size="sm"
            disabled={deleteInput !== "确认删除"}
          >
            删除我的账号
          </Button>
          {deleteMsg && <p className="text-xs text-danger">{deleteMsg}</p>}
        </div>
      </section>
    </div>
  );
}
