import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

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
    select: { userId: true, apiKey: true, baseUrl: true, modelName: true },
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

  try {
    const resp = await fetch(`${model.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelName,
        messages: [{ role: "user", content: "你好" }],
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
