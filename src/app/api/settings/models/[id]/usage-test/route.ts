import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

function parseConfigJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/** 内置提取器：兼容常见余额接口格式 */
function builtInExtractor(response: Record<string, unknown>): { remaining: string; unit: string } {
  // balance_infos 数组格式（智谱AI 等）
  const infos = response.balance_infos as Array<Record<string, unknown>> | undefined;
  if (infos && infos.length > 0) {
    const info = infos[0];
    return {
      remaining: String(info.total_balance ?? ""),
      unit: String(info.currency ?? ""),
    };
  }
  // 顶层 total_balance（DeepSeek 等）
  if (response.total_balance !== undefined) {
    return {
      remaining: String(response.total_balance),
      unit: String(response.unit ?? response.currency ?? ""),
    };
  }
  // 通用 balance 字段
  if (response.balance !== undefined) {
    return { remaining: String(response.balance), unit: "" };
  }
  return { remaining: "", unit: "" };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const model = await prisma.aIModel.findUnique({
    where: { id },
    select: { userId: true, apiKey: true, baseUrl: true, configJson: true },
  });

  if (!model || model.userId !== session.user.id) {
    return NextResponse.json({ error: "模型不存在" }, { status: 404 });
  }

  let apiKey: string;
  try {
    apiKey = decrypt(model.apiKey);
  } catch {
    return NextResponse.json({ error: "API Key 解密失败" }, { status: 500 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "请先设置 API Key" }, { status: 400 });
  }

  const body = await request.json();
  const { url, method, headers, extractor, timeout, saveResult } = body as {
    url: string;
    method: string;
    headers: Record<string, string>;
    extractor: string;
    timeout: number;
    saveResult?: boolean;
  };

  const resolvedUrl = url.replace("{{baseUrl}}", model.baseUrl);
  const resolvedHeaders: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    resolvedHeaders[key] = val.replace("{{apiKey}}", apiKey);
  }

  try {
    const resp = await fetch(resolvedUrl, {
      method: method || "GET",
      headers: resolvedHeaders,
      signal: AbortSignal.timeout((timeout || 10) * 1000),
    });

    const respBody = await resp.text();
    let json: unknown;
    try {
      json = JSON.parse(respBody);
    } catch {
      json = { raw: respBody };
    }

    // 1. 优先用内置提取器（保证正确解析 balance_infos / total_balance）
    let remaining: string;
    let unit: string;

    const builtIn = builtInExtractor(json as Record<string, unknown>);

    // 2. 如果用户配置了自定义提取器，尝试用它覆盖
    if (extractor) {
      try {
        const extractFn = new Function("response", `"use strict"; return (${extractor})(response);`);
        const custom = extractFn(json) as { remaining?: string; unit?: string } | undefined;
        // 自定义提取器有非空 remaining 时才采用，否则回退内置
        if (custom?.remaining && String(custom.remaining).trim()) {
          remaining = String(custom.remaining);
          unit = custom.unit || builtIn.unit;
        } else {
          remaining = builtIn.remaining;
          unit = builtIn.unit || custom?.unit || "";
        }
      } catch {
        remaining = builtIn.remaining;
        unit = builtIn.unit;
      }
    } else {
      remaining = builtIn.remaining;
      unit = builtIn.unit;
    }

    // 保存结果到 configJson
    if (saveResult !== false) {
      const configObj = parseConfigJson(model.configJson);
      const uc = (configObj.usageCheck || {}) as Record<string, unknown>;
      uc.lastChecked = new Date().toISOString();
      uc.lastRemaining = remaining;
      uc.lastUnit = unit;
      uc.lastError = null;
      if (uc.enabled === undefined) uc.enabled = true;
      configObj.usageCheck = uc;
      await prisma.aIModel.update({
        where: { id },
        data: { configJson: JSON.stringify(configObj) },
      });
    }

    return NextResponse.json({
      success: true,
      result: { remaining, unit },
      rawResponse: JSON.stringify(json, null, 2),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    const errorText = message.includes("timeout") || message.includes("abort")
      ? "请求超时"
      : `请求失败: ${message}`;

    try {
      const configObj = parseConfigJson(model.configJson);
      const uc = (configObj.usageCheck || {}) as Record<string, unknown>;
      uc.lastError = errorText;
      if (uc.enabled === undefined) uc.enabled = true;
      configObj.usageCheck = uc;
      await prisma.aIModel.update({
        where: { id },
        data: { configJson: JSON.stringify(configObj) },
      });
    } catch { /* ignore */ }

    return NextResponse.json({ success: false, error: errorText });
  }
}
