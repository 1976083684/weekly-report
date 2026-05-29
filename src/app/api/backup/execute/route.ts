import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { backupToGit } from "@/lib/backup";
import { nowShanghai } from "@/lib/shanghai-time";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { configId, scope } = await request.json();

    if (!configId) {
      return NextResponse.json({ error: "请指定备份配置" }, { status: 400 });
    }

    const { status, message } = await backupToGit(configId, session.user.id, scope || "week");

    const config = await prisma.backupConfig.findUnique({ where: { id: configId }, select: { provider: true } });

    await prisma.backupLog.create({
      data: {
        userId: session.user.id,
        configId,
        type: config?.provider || "manual",
        status,
        message,
        createdAt: nowShanghai(),
      },
    });

    return NextResponse.json({ success: status === "success", status, message });
  } catch (err) {
    const msg = (err as Error).message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
