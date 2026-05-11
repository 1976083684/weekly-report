import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { PRESET_MODELS } from "@/lib/preset-models";
import { z } from "zod";

const modelSchema = z.object({
  provider: z.string().min(1, "供应商不能为空"),
  modelName: z.string().min(1, "模型名称不能为空"),
  apiKey: z.string(),
  baseUrl: z.string().min(1, "请求地址不能为空"),
  website: z.string().optional(),
  notes: z.string().optional(),
  haikuModel: z.string().optional(),
  sonnetModel: z.string().optional(),
  opusModel: z.string().optional(),
  configJson: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let models = await prisma.aIModel.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  // 自动修复已有智谱模型的 usageCheck 配置（若无或过时则更新）
  for (const model of models) {
    if (model.provider === "智谱AI" && model.baseUrl === PRESET_MODELS.zhipu.baseUrl) {
      let configObj: Record<string, unknown> = {};
      try { if (model.configJson) configObj = JSON.parse(model.configJson); } catch { /* keep */ }
      const uc = configObj.usageCheck as Record<string, unknown> | undefined;
      const block = (uc?.block as string) || "";
      // 未配置或仍使用旧的 monitor/balance 端点时自动更新
      if (!uc || block.includes("monitor") || block.includes("/user/balance")) {
        const presetConfig = JSON.parse(PRESET_MODELS.zhipu.configJson);
        configObj.usageCheck = presetConfig.usageCheck;
        const updatedJson = JSON.stringify(configObj);
        await prisma.aIModel.update({
          where: { id: model.id },
          data: { configJson: updatedJson },
        });
        model.configJson = updatedJson;
      }
    }
  }

  function parseUsageBalance(configJson: string | null) {
    if (!configJson) return { enabled: false, lastChecked: null, remaining: "", unit: "", error: null };
    try {
      const obj = JSON.parse(configJson);
      const uc = obj.usageCheck;
      if (!uc || !uc.enabled) return { enabled: false, lastChecked: null, remaining: "", unit: "", error: null };
      return {
        enabled: true,
        lastChecked: uc.lastChecked || null,
        remaining: uc.lastRemaining !== undefined && uc.lastRemaining !== null ? String(uc.lastRemaining) : "",
        unit: uc.lastUnit || "",
        error: uc.lastError || null,
      };
    } catch { return { enabled: false, lastChecked: null, remaining: "", unit: "", error: null }; }
  }

  const safeModels = models.map((m) => ({
    id: m.id,
    provider: m.provider,
    modelName: m.modelName,
    baseUrl: m.baseUrl,
    website: m.website,
    notes: m.notes,
    haikuModel: m.haikuModel,
    sonnetModel: m.sonnetModel,
    opusModel: m.opusModel,
    configJson: m.configJson,
    isActive: m.isActive,
    hasKey: decryptSafe(m.apiKey).length > 0,
    usageBalance: parseUsageBalance(m.configJson),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));

  return NextResponse.json({ models: safeModels });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = modelSchema.parse(body);

    const model = await prisma.aIModel.create({
      data: {
        userId: session.user.id,
        provider: data.provider,
        modelName: data.modelName,
        apiKey: encrypt(data.apiKey),
        baseUrl: data.baseUrl,
        website: data.website || null,
        notes: data.notes || null,
        haikuModel: data.haikuModel || null,
        sonnetModel: data.sonnetModel || null,
        opusModel: data.opusModel || null,
        configJson: data.configJson || null,
      },
    });

    return NextResponse.json({
      model: {
        id: model.id,
        provider: model.provider,
        modelName: model.modelName,
        baseUrl: model.baseUrl,
        website: model.website,
        notes: model.notes,
        haikuModel: model.haikuModel,
        sonnetModel: model.sonnetModel,
        opusModel: model.opusModel,
        configJson: model.configJson,
        isActive: model.isActive,
        hasKey: true,
        createdAt: model.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "添加模型失败" }, { status: 500 });
  }
}

function decryptSafe(encoded: string): string {
  try {
    return decrypt(encoded);
  } catch {
    return "";
  }
}
