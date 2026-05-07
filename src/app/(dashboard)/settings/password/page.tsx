"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PasswordPage() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        返回设置
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">修改密码</h1>

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
    </div>
  );
}
