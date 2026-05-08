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
    select: { userId: true, apiKey: true, baseUrl: true },
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
    const resp = await fetch(`${model.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return NextResponse.json({
        success: false,
        error: `不支持获取模型列表 (${resp.status})`,
      });
    }

    const json = await resp.json();
    const data = json.data || [];
    const models: string[] = data
      .map((m: { id?: string; name?: string; model?: string }) => m.id || m.name || m.model || "")
      .filter((name: string) => name.length > 0)
      .sort();

    return NextResponse.json({ success: true, models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    if (message.includes("timeout") || message.includes("abort")) {
      return NextResponse.json({ success: false, error: "请求超时" });
    }
    return NextResponse.json({ success: false, error: `该供应商不支持获取模型列表` });
  }
}
