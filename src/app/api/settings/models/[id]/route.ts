import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { z } from "zod";

const updateSchema = z.object({
  provider: z.string().min(1).optional(),
  modelName: z.string().min(1).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().min(1).optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  haikuModel: z.string().optional(),
  sonnetModel: z.string().optional(),
  opusModel: z.string().optional(),
  configJson: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.aIModel.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "模型不存在" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.modelName !== undefined) updateData.modelName = data.modelName;
    if (data.apiKey !== undefined) updateData.apiKey = encrypt(data.apiKey);
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl;
    if (data.website !== undefined) updateData.website = data.website || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.haikuModel !== undefined) updateData.haikuModel = data.haikuModel || null;
    if (data.sonnetModel !== undefined) updateData.sonnetModel = data.sonnetModel || null;
    if (data.opusModel !== undefined) updateData.opusModel = data.opusModel || null;
    if (data.configJson !== undefined) updateData.configJson = data.configJson || null;

    // 如果设置为激活，先取消其他模型的激活状态
    if (data.isActive) {
      await prisma.aIModel.updateMany({
        where: { userId: session.user.id },
        data: { isActive: false },
      });
      updateData.isActive = true;
    }

    const model = await prisma.aIModel.update({
      where: { id },
      data: updateData,
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
        hasKey: decryptSafe(model.apiKey),
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "更新模型失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.aIModel.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "模型不存在" }, { status: 404 });
  }

  await prisma.aIModel.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

function decryptSafe(encoded: string): string {
  try {
    return decrypt(encoded);
  } catch {
    return "";
  }
}
