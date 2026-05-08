"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Feather, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次密码不一致");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, phone: phone || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "注册失败");
        setLoading(false);
        return;
      }

      router.push("/login");
    } catch {
      setError("注册失败，请稍后重试");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <Feather className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-[family-name:var(--font-serif)] text-3xl font-bold tracking-tight text-foreground">
          日记周报
        </h1>
        <p className="text-muted-foreground text-sm mt-2">开始记录你的每一天</p>
      </div>

      {/* 卡片 */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl shadow-black/5">
        {/* 登录/注册切换 */}
        <div className="flex mb-6 bg-muted rounded-lg p-1">
          <Link
            href="/login"
            className="flex-1 py-2 text-sm font-medium rounded-md text-center text-muted-foreground hover:text-foreground transition-colors"
          >
            登录
          </Link>
          <span className="flex-1 py-2 text-sm font-medium rounded-md text-center bg-primary/10 text-primary">
            注册
          </span>
        </div>

        {/* 注册表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              昵称
            </label>
            <Input
              type="text"
              placeholder="你的昵称（可选）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 px-3.5"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              邮箱
            </label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 px-3.5"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              手机号
              <span className="text-muted-foreground/60 ml-1">（选填，绑定后可用手机号登录）</span>
            </label>
            <Input
              type="tel"
              placeholder="输入手机号（可选）"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 px-3.5"
              maxLength={11}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              密码
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="至少8位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 px-3.5 pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              确认密码
            </label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 px-3.5 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full h-10 rounded-lg"
            disabled={loading}
          >
            {loading ? "注册中..." : "注册"}
          </Button>
        </form>
      </div>

      {/* 底部提示 */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        已有账号？{" "}
        <Link href="/login" className="text-primary hover:underline">
          登录
        </Link>
      </p>
    </div>
  );
}
