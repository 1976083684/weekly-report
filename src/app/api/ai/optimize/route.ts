import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { DEFAULT_PROMPTS } from "@/lib/default-prompts";
import { z } from "zod";

const optimizeSchema = z.object({
  content: z.string().min(1, "内容不能为空"),
  type: z.enum(["diary", "daily_report", "weekly"]),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const parsed = optimizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { content, type } = parsed.data;

  // 查找启用的模型
  const activeModel = await prisma.aIModel.findFirst({
    where: { userId: session.user.id, isActive: true },
  });

  if (!activeModel) {
    return NextResponse.json(
      { error: "没有启用的AI模型，请先在设置→模型配置中添加并启用一个模型" },
      { status: 400 }
    );
  }

  let apiKey: string;
  try {
    apiKey = decrypt(activeModel.apiKey);
  } catch {
    return NextResponse.json({ error: "API Key 解密失败" }, { status: 500 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "请先设置 API Key" }, { status: 400 });
  }

  // 加载用户自定义提示词，未配置时回退到默认值
  const dbType = type === "diary" ? "diary" : "report";
  const userPrompt = await prisma.promptTemplate.findUnique({
    where: { userId_type: { userId: session.user.id, type: dbType } },
    select: { systemPrompt: true },
  });
  const systemPrompt = userPrompt?.systemPrompt || DEFAULT_PROMPTS[dbType] || DEFAULT_PROMPTS.diary;

  try {
    const resp = await fetch(`${activeModel.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: activeModel.modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `请优化以下${type === "diary" ? "日记" : type === "daily_report" ? "日报" : "周报"}内容：\n\n${content}` },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({
        error: `AI API 返回错误 (${resp.status}): ${errText.slice(0, 300)}`,
      }, { status: 502 });
    }

    const json = await resp.json();
    const optimized = json.choices?.[0]?.message?.content || "";

    if (!optimized) {
      return NextResponse.json({ error: "AI 返回内容为空" }, { status: 502 });
    }

    return NextResponse.json({ optimized });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    if (message.includes("timeout") || message.includes("abort")) {
      return NextResponse.json({ error: "AI API 请求超时" }, { status: 502 });
    }
    return NextResponse.json({ error: `AI API 连接失败: ${message}` }, { status: 502 });
  }
}
