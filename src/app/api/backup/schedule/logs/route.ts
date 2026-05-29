import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const configId = req.nextUrl.searchParams.get("configId");
  if (!configId) {
    return NextResponse.json({ error: "缺少 configId" }, { status: 400 });
  }

  const logs = await prisma.backupLog.findMany({
    where: {
      userId: session.user.id,
      configId,
      message: { contains: "定时备份" },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      type: true,
      status: true,
      message: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}
