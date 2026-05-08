import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const original = await prisma.aIModel.findUnique({
    where: { id },
  });

  if (!original || original.userId !== session.user.id) {
    return NextResponse.json({ error: "模型不存在" }, { status: 404 });
  }

  // 循环尝试不同后缀，避免唯一约束冲突
  let provider = original.provider + " copy";
  let copy: typeof original | null = null;
  for (let i = 1; i <= 20; i++) {
    const exists = await prisma.aIModel.findUnique({
      where: {
        userId_provider_modelName: {
          userId: session.user.id,
          provider,
          modelName: original.modelName,
        },
      },
    });
    if (!exists) {
      copy = await prisma.aIModel.create({
        data: {
          userId: session.user.id,
          provider,
          modelName: original.modelName,
          apiKey: original.apiKey,
          baseUrl: original.baseUrl,
          website: original.website,
          notes: original.notes,
          haikuModel: original.haikuModel,
          sonnetModel: original.sonnetModel,
          opusModel: original.opusModel,
          configJson: original.configJson,
          isActive: false,
        },
      });
      break;
    }
    provider = original.provider + ` copy ${i + 1}`;
  }

  if (!copy) {
    return NextResponse.json({ error: "复制失败，名称冲突" }, { status: 409 });
  }

  return NextResponse.json({
    model: {
      id: copy.id,
      provider: copy.provider,
      modelName: copy.modelName,
      baseUrl: copy.baseUrl,
      website: copy.website,
      notes: copy.notes,
      haikuModel: copy.haikuModel,
      sonnetModel: copy.sonnetModel,
      opusModel: copy.opusModel,
      configJson: copy.configJson,
      isActive: copy.isActive,
      hasKey: original.apiKey.length > 0,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
    },
  });
}
