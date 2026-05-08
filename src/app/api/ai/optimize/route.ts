import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { PRESET_MODELS } from "@/lib/preset-models";
import { z } from "zod";

const SYSTEM_PROMPTS: Record<string, string> = {
  diary: `你是一位专业的日记优化助手。你的任务是将用户的日记草稿优化为标准化、流畅的日记。

要求：
1. 保持第一人称叙述，保留原始的情感和个人风格。
2. 优化语言表达，使其更流畅、更优美，但不改变原意。
3. 使用清晰的时间顺序组织内容。
4. 适度使用 Markdown 格式（标题、列表、加粗等）增强可读性。
5. 保持日记的私密、个人化语气，像是一个人在回顾自己的一天。
6. 保留所有重要细节和事件，不要删减内容。
7. 如果原文包含心情描述，将其自然地融入叙述中。

直接返回优化后的日记全文，不附加任何解释。`,

  daily_report: `你是一位专业的日报优化助手。你的任务是将用户的工作日报草稿优化为标准化的工作日报。

要求：
1. 使用清晰的结构：今日工作内容、遇到的问题及解决方案、明日计划。
2. 工作内容使用列表形式呈现，每条前用简短标签标注类别（如【开发】【会议】【文档】等）。
3. 保持客观、专业的工作语气。
4. 突出重点工作和关键成果，量化成果（如完成XX个功能）。
5. 使用 Markdown 格式增强可读性。
6. 保留所有重要工作内容和细节，不要删减。
7. 如果原文缺少某些板块（如问题或计划），保留原有内容即可，不要编造。

直接返回优化后的日报全文，不附加任何解释。`,

  weekly: `你是一位专业的周报优化助手。你的任务是将用户的周报草稿优化为标准化的周报。

要求：
1. 使用清晰的结构：本周工作摘要、各项工作详情、下周计划。
2. 本周摘要用2-3句话概括本周主要成果。
3. 工作详情按天或项目分组，使用列表呈现。
4. 量化成果（如完成XX个功能、解决XX个问题）。
5. 保持客观、专业的工作语气。
6. 使用 Markdown 格式增强可读性（标题、分隔线、列表等）。
7. 保留所有重要工作内容，不要删减。

直接返回优化后的周报全文，不附加任何解释。`,
};

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

  // 查找启用的模型，如果没有则自动创建预设
  let activeModel = await prisma.aIModel.findFirst({
    where: { userId: session.user.id, isActive: true },
  });

  if (!activeModel) {
    // 自动创建预设模型
    const totalModels = await prisma.aIModel.count({ where: { userId: session.user.id } });
    if (totalModels === 0) {
      for (const [, preset] of Object.entries(PRESET_MODELS)) {
        await prisma.aIModel.create({
          data: {
            userId: session.user.id,
            provider: preset.provider,
            modelName: preset.modelName,
            apiKey: encrypt(""), // 不预设 Key，需要用户自行填写
            baseUrl: preset.baseUrl,
            website: preset.website,
            notes: preset.notes,
            haikuModel: preset.haikuModel,
            sonnetModel: preset.sonnetModel,
            opusModel: preset.opusModel,
            configJson: preset.configJson,
            isActive: false,
          },
        });
      }
      activeModel = await prisma.aIModel.findFirst({
        where: { userId: session.user.id, isActive: true },
      });
    }
  }

  if (!activeModel) {
    return NextResponse.json(
      { error: "没有启用的AI模型，请先在设置→模型配置中启用一个模型" },
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

  const systemPrompt = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.diary;

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
