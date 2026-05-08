"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Feather, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("邮箱/手机号或密码不正确");
    } else {
      router.push("/dashboard");
      router.refresh();
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
        <p className="text-muted-foreground text-sm mt-2">记录每一天，回顾每一周</p>
      </div>

      {/* 卡片 */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl shadow-black/5">
        {/* 登录/注册切换 */}
        <div className="flex mb-6 bg-muted rounded-lg p-1">
          <span className="flex-1 py-2 text-sm font-medium rounded-md text-center bg-primary/10 text-primary">
            登录
          </span>
          <Link
            href="/register"
            className="flex-1 py-2 text-sm font-medium rounded-md text-center text-muted-foreground hover:text-foreground transition-colors"
          >
            注册
          </Link>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              邮箱 / 手机号
            </label>
            <Input
              type="text"
              placeholder="请输入邮箱或手机号"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="h-10 px-3.5"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              密码
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 px-3.5 pr-10"
                required
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
          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full h-10 rounded-lg"
            disabled={loading}
          >
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>

        {/* 分割线 */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            或通过以下方式
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* 第三方登录 */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-10 rounded-lg border-border text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5"
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10 rounded-lg border-border text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5"
            onClick={() => signIn("gitee", { callbackUrl: "/dashboard" })}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.926c0 .327.266.593.593.593h4.445c.327 0 .593-.266.593-.593v-2.37a.593.593 0 0 0-.593-.593h-2.37a.593.593 0 0 1-.592-.593v-1.482a.593.593 0 0 1 .593-.592h5.036c.328 0 .593.266.593.592v5.037c0 1.636-1.327 2.963-2.963 2.963H7.556a2.963 2.963 0 0 1-2.963-2.963V9.185a4.741 4.741 0 0 1 4.74-4.74h8.74z" />
            </svg>
            Gitee
          </Button>
        </div>
      </div>

      {/* 底部提示 */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        还没有账号？{" "}
        <Link href="/register" className="text-primary hover:underline">
          注册
        </Link>
        <span className="mx-2">·</span>
        数据安全存储，支持备份至 GitHub / Gitee
      </p>
    </div>
  );
}
