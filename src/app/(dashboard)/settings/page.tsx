"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Globe,
  Download,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BackupConfigForm } from "@/components/backup/BackupConfigForm";

interface UserData {
  id: string;
  email: string;
  name: string;
  image?: string;
  accounts: { provider: string; providerAccountId: string }[];
}

interface BackupConfig {
  id: string;
  provider: string;
  repoUrl: string;
  branch: string;
  path: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [configs, setConfigs] = useState<BackupConfig[]>([]);

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  // Delete
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");

  const fetchData = async () => {
    const [userRes, configRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/backup/config"),
    ]);
    if (userRes.ok) {
      const data = await userRes.json();
      setUser(data.user);
    }
    if (configRes.ok) {
      const data = await configRes.json();
      setConfigs(data.configs || []);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePassword = async () => {
    setPwMsg("");
    const res = await fetch("/api/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw }),
    });
    const data = await res.json();
    setPwMsg(data.success ? "密码修改成功" : data.error || "修改失败");
    if (data.success) { setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  };

  const handleExport = () => {
    window.open("/api/settings/export", "_blank");
  };

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

  const isOAuthBound = (provider: string) =>
    user?.accounts?.some((a) => a.provider === provider);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">设置</h1>

      {/* Account Info */}
      <section className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" /> 账号信息
        </h2>
        {user && (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">邮箱</span>
              <span className="text-foreground">{user.email}</span>
              <span className="text-muted-foreground">昵称</span>
              <span className="text-foreground">{user.name}</span>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  GitHub {isOAuthBound("github") ? "已绑定" : "未绑定"}
                </span>
                {!isOAuthBound("github") && (
                  <Button size="sm" variant="outline" onClick={() => signIn("github")}>去绑定</Button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.926c0 .327.266.593.593.593h4.445c.327 0 .593-.266.593-.593v-2.37a.593.593 0 0 0-.593-.593h-2.37a.593.593 0 0 1-.592-.593v-1.482a.593.593 0 0 1 .593-.592h5.036c.328 0 .593.266.593.592v5.037c0 1.636-1.327 2.963-2.963 2.963H7.556a2.963 2.963 0 0 1-2.963-2.963V9.185a4.741 4.741 0 0 1 4.74-4.74h8.74z"/>
                  </svg>
                  Gitee {isOAuthBound("gitee") ? "已绑定" : "未绑定"}
                </span>
                {!isOAuthBound("gitee") && (
                  <Button size="sm" variant="outline" onClick={() => signIn("gitee")}>去绑定</Button>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Change Password */}
      <section className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" /> 修改密码
        </h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">当前密码</Label>
            <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">新密码</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-9" placeholder="至少8位，需含字母和数字" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">确认密码</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="h-9" />
          </div>
          {pwMsg && (
            <p className={`text-xs ${pwMsg === "密码修改成功" ? "text-success" : "text-danger"}`}>{pwMsg}</p>
          )}
          <Button onClick={handlePassword} size="sm">修改密码</Button>
        </div>
      </section>

      {/* Backup Config */}
      <section className="space-y-3">
        <h2 className="font-medium text-sm">备份配置</h2>
        <BackupConfigForm
          provider="github"
          initialData={configs.find((c) => c.provider === "github") || null}
          onSuccess={fetchData}
        />
        <BackupConfigForm
          provider="gitee"
          initialData={configs.find((c) => c.provider === "gitee") || null}
          onSuccess={fetchData}
        />
      </section>

      {/* Export */}
      <section className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <Download className="w-4 h-4 text-muted-foreground" /> 数据导出
        </h2>
        <p className="text-xs text-muted-foreground">将所有日记、周报、标签导出为 JSON 文件</p>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          导出数据
        </Button>
      </section>

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
