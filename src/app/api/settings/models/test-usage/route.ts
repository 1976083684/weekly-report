import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** 内置提取器：兼容常见余额接口格式 */
function builtInExtractor(response: Record<string, unknown>): { remaining: string; unit: string } {
  const infos = response.balance_infos as Array<Record<string, unknown>> | undefined;
  if (infos && infos.length > 0) {
    const info = infos[0];
    return {
      remaining: String(info.total_balance ?? ""),
      unit: String(info.currency ?? ""),
    };
  }
  if (response.total_balance !== undefined) {
    return {
      remaining: String(response.total_balance),
      unit: String(response.unit ?? response.currency ?? ""),
    };
  }
  if (response.balance !== undefined) {
    return { remaining: String(response.balance), unit: "" };
  }
  return { remaining: "", unit: "" };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url, method, headers, extractor, timeout, baseUrl, apiKey } = body as {
      url: string;
      method: string;
      headers: Record<string, string>;
      extractor: string;
      timeout: number;
      baseUrl?: string;
      apiKey?: string;
    };

    const resolvedUrl = url.replace("{{baseUrl}}", baseUrl || "");
    const resolvedHeaders: Record<string, string> = {};
    for (const [key, val] of Object.entries(headers)) {
      resolvedHeaders[key] = val.replace("{{apiKey}}", apiKey || "");
    }

    const resp = await fetch(resolvedUrl, {
      method: method || "GET",
      headers: resolvedHeaders,
      signal: AbortSignal.timeout((timeout || 10) * 1000),
    });

    const respBody = await resp.text();
    let json: unknown;
    try { json = JSON.parse(respBody); } catch { json = { raw: respBody }; }

    let remaining: string;
    let unit: string;

    const builtIn = builtInExtractor(json as Record<string, unknown>);

    if (extractor) {
      try {
        const extractFn = new Function("response", `"use strict"; return (${extractor})(response);`);
        const custom = extractFn(json) as { remaining?: string; unit?: string } | undefined;
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

    return NextResponse.json({
      success: true,
      result: { remaining, unit },
      rawResponse: JSON.stringify(json, null, 2),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({
      success: false,
      error: message.includes("timeout") || message.includes("abort") ? "请求超时" : `请求失败: ${message}`,
    });
  }
}
