import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const model = await prisma.aIModel.findUnique({
    where: { id },
    select: { userId: true, apiKey: true },
  });

  if (!model || model.userId !== session.user.id) {
    return NextResponse.json({ error: "模型不存在" }, { status: 404 });
  }

  try {
    const key = decrypt(model.apiKey);
    return NextResponse.json({ apiKey: key });
  } catch {
    return NextResponse.json({ error: "API Key 解密失败" }, { status: 500 });
  }
}
