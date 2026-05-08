"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, User, Globe, LogOut, Shuffle, Phone, Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface UserData {
  id: string;
  email: string;
  phone?: string;
  name: string;
  image?: string;
  accounts: { provider: string; providerAccountId: string }[];
}

export default function AccountPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneMsg, setPhoneMsg] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);

  const loadUser = () => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setPhone(data.user?.phone || "");
      });
  };

  useEffect(() => {
    loadUser();
  }, []);

  const isOAuthBound = (provider: string) =>
    user?.accounts?.some((a) => a.provider === provider);

  const savePhone = async () => {
    setPhoneMsg("");
    setPhoneSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setEditingPhone(false);
        setPhoneMsg("手机号已更新");
      } else {
        setPhoneMsg(data.error || "更新失败");
      }
    } catch {
      setPhoneMsg("网络错误，请稍后重试");
    }
    setPhoneSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        返回设置
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">我的信息</h1>

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
              <span className="text-muted-foreground">手机号</span>
              {editingPhone ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="输入手机号"
                    className="h-7 text-sm w-36"
                  />
                  <button
                    type="button"
                    onClick={savePhone}
                    disabled={phoneSaving}
                    className="inline-flex items-center justify-center h-7 w-7 rounded text-success hover:bg-success/10"
                    title="保存"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingPhone(false); setPhone(user.phone || ""); setPhoneMsg(""); }}
                    className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground"
                    title="取消"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground">{user.phone || "未绑定"}</span>
                  <button
                    type="button"
                    onClick={() => { setEditingPhone(true); setPhoneMsg(""); }}
                    className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="绑定/修改手机号"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            {phoneMsg && (
              <p className={`text-xs ${phoneMsg.includes("失败") || phoneMsg.includes("错误") || phoneMsg.includes("已被") ? "text-danger" : "text-success"}`}>
                {phoneMsg}
              </p>
            )}
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  GitHub {isOAuthBound("github") ? "已绑定" : "未绑定"}
                </span>
                {!isOAuthBound("github") ? (
                  <Button size="sm" variant="outline" onClick={() => signIn("github")}>去绑定</Button>
                ) : (
                  <span className="text-xs text-muted-foreground">已绑定</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.926c0 .327.266.593.593.593h4.445c.327 0 .593-.266.593-.593v-2.37a.593.593 0 0 0-.593-.593h-2.37a.593.593 0 0 1-.592-.593v-1.482a.593.593 0 0 1 .593-.592h5.036c.328 0 .593.266.593.592v5.037c0 1.636-1.327 2.963-2.963 2.963H7.556a2.963 2.963 0 0 1-2.963-2.963V9.185a4.741 4.741 0 0 1 4.74-4.74h8.74z"/>
                  </svg>
                  Gitee {isOAuthBound("gitee") ? "已绑定" : "未绑定"}
                </span>
                {!isOAuthBound("gitee") ? (
                  <Button size="sm" variant="outline" onClick={() => signIn("gitee")}>去绑定</Button>
                ) : (
                  <span className="text-xs text-muted-foreground">已绑定</span>
                )}
              </div>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
                <Shuffle className="w-3.5 h-3.5 mr-1" />
                切换账号
              </Button>
              <Button size="sm" variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="w-3.5 h-3.5 mr-1" />
                退出登录
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
