import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

const DEFAULT_BLOCK = `({
  request: {
    url: "{{baseUrl}}/user/balance",
    method: "GET",
    headers: {
      "Authorization": "Bearer {{apiKey}}",
      "User-Agent": "cc-switch/1.0"
    }
  },
  extractor: function(response) {
    var info = (response.balance_infos && response.balance_infos[0]) || {};
    return {
      remaining: info.total_balance || response.total_balance || response.balance || "",
      unit: info.currency || response.unit || ""
    };
  }
})`;

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

function parseBlock(block: string) {
  try {
    const fn = new Function(`"use strict"; return ${block};`);
    return fn() as { request?: { url?: string; method?: string; headers?: Record<string, string> }; extractor?: unknown };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      // 手动模式参数
      url: directUrl,
      method: directMethod,
      headers: directHeaders,
      extractor: directExtractor,
      timeout: directTimeout,
      baseUrl: providedBaseUrl,
      apiKey: providedApiKey,
      // 自动模式参数
      modelId,
      saveResult,
    } = body as {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      extractor?: string;
      timeout?: number;
      baseUrl?: string;
      apiKey?: string;
      modelId?: string;
      saveResult?: boolean;
    };

    let finalUrl: string;
    let finalMethod: string;
    let finalHeaders: Record<string, string>;
    let finalExtractor: string;
    let finalTimeout: number;

    if (modelId) {
      // 自动模式：从数据库读取模型配置
      const model = await prisma.aIModel.findUnique({
        where: { id: modelId },
        select: { userId: true, baseUrl: true, apiKey: true, configJson: true },
      });

      if (!model || model.userId !== session.user.id) {
        return NextResponse.json({ error: "模型不存在" }, { status: 404 });
      }

      let apiKey = "";
      try { apiKey = decrypt(model.apiKey); } catch { /* leave empty */ }

      // 从 configJson 读取 usageCheck 配置
      let block = DEFAULT_BLOCK;
      let timeout = directTimeout || 10;

      try {
        if (model.configJson) {
          const obj = JSON.parse(model.configJson);
          const uc = obj.usageCheck as Record<string, unknown> | undefined;
          if (uc?.block) block = String(uc.block);
          if (uc?.timeout) timeout = Number(uc.timeout) || 10;
        }
      } catch { /* use defaults */ }

      const parsed = parseBlock(block);
      if (!parsed) {
        return NextResponse.json({ success: false, error: "配置格式解析失败" });
      }

      const req = parsed.request || {};
      finalUrl = (req.url || "").replace("{{baseUrl}}", model.baseUrl);
      finalMethod = req.method || "GET";
      finalHeaders = {};
      for (const [key, val] of Object.entries(req.headers || {})) {
        finalHeaders[key] = val.replace("{{apiKey}}", apiKey);
      }
      finalExtractor = typeof parsed.extractor === "function" ? parsed.extractor.toString() : "";
      finalTimeout = timeout;
    } else {
      // 手动模式：替换占位符后直接使用传入参数
      const resolvedBaseUrl = providedBaseUrl || "";
      const resolvedApiKey = providedApiKey || "";
      finalUrl = (directUrl || "").replace("{{baseUrl}}", resolvedBaseUrl);
      finalMethod = directMethod || "GET";
      finalHeaders = {};
      for (const [key, val] of Object.entries(directHeaders || {})) {
        finalHeaders[key] = val.replace("{{apiKey}}", resolvedApiKey);
      }
      finalExtractor = directExtractor || "";
      finalTimeout = directTimeout || 10;
    }

    // 发起请求查询余额
    const resp = await fetch(finalUrl, {
      method: finalMethod || "GET",
      headers: finalHeaders,
      signal: AbortSignal.timeout((finalTimeout || 10) * 1000),
    });

    const respBody = await resp.text();
    let json: unknown;
    try { json = JSON.parse(respBody); } catch { json = { raw: respBody }; }

    let remaining: string;
    let unit: string;

    const builtIn = builtInExtractor(json as Record<string, unknown>);

    if (finalExtractor) {
      try {
        const extractFn = new Function("response", `"use strict"; return (${finalExtractor})(response);`);
        const custom = extractFn(json) as { remaining?: string; unit?: string; error?: string } | undefined;
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

    // 持久化结果到数据库
    if (saveResult && modelId) {
      try {
        const model = await prisma.aIModel.findUnique({
          where: { id: modelId },
          select: { userId: true, configJson: true },
        });
        if (model && model.userId === session.user.id) {
          let configObj: Record<string, unknown> = {};
          if (model.configJson) {
            try { configObj = JSON.parse(model.configJson); } catch { /* keep empty */ }
          }
          const uc = (configObj.usageCheck || {}) as Record<string, unknown>;
          uc.enabled = true;
          uc.lastChecked = new Date().toISOString();
          uc.lastRemaining = remaining;
          uc.lastUnit = unit;
          uc.lastError = resp.ok ? null : `HTTP ${resp.status}`;
          configObj.usageCheck = uc;
          await prisma.aIModel.update({
            where: { id: modelId },
            data: { configJson: JSON.stringify(configObj) },
          });
        }
      } catch { /* 保存失败不影响返回结果 */ }
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
