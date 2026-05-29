import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshUserSchedule } from "@/lib/schedule-runner";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const config = await prisma.backupConfig.findFirst({
    where: { userId: session.user.id },
    select: { scheduleInterval: true },
  });

  return NextResponse.json({ interval: config?.scheduleInterval || 3600000 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { interval } = await req.json();
  if (typeof interval !== "number" || interval < 5000 || interval > 7200000) {
    return NextResponse.json({ error: "无效的间隔值" }, { status: 400 });
  }

  // 更新该用户所有配置的巡逻间隔
  await prisma.backupConfig.updateMany({
    where: { userId: session.user.id },
    data: { scheduleInterval: interval },
  });

  // 刷新定时器，使新间隔立即生效
  await refreshUserSchedule(session.user.id);

  return NextResponse.json({ success: true, interval });
}
