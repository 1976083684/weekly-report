import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { configId } = await request.json();

    if (!configId) {
      return NextResponse.json({ error: "缺少 configId" }, { status: 400 });
    }

    const config = await prisma.backupConfig.findFirst({
      where: { id: configId, userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ error: "配置不存在" }, { status: 404 });
    }

    if (!config.token) {
      return NextResponse.json({ error: "未保存 Token" }, { status: 400 });
    }

    const token = decrypt(config.token);
    return NextResponse.json({ token });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
