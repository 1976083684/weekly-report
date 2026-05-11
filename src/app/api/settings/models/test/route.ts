import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { baseUrl, apiKey, modelName } = await request.json();

    if (!baseUrl || !apiKey || !modelName) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({
        success: false,
        error: `API 返回错误 (${resp.status}): ${errText.slice(0, 200)}`,
      });
    }

    const json = await resp.json();
    const reply = json.choices?.[0]?.message?.content || "";

    return NextResponse.json({ success: true, reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    if (message.includes("timeout") || message.includes("abort")) {
      return NextResponse.json({ success: false, error: "请求超时，请检查网络或 Base URL" });
    }
    return NextResponse.json({ success: false, error: `连接失败: ${message}` });
  }
}
