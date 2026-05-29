import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshUserSchedule } from "@/lib/schedule-runner";
import { z } from "zod";

const schema = z.object({
  provider: z.enum(["github", "gitee"]),
});

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { provider } = schema.parse(await request.json());

    // 关闭所有 provider 的定时
    await prisma.backupConfig.updateMany({
      where: { userId: session.user.id, scheduleEnabled: true },
      data: { scheduleEnabled: false },
    });

    // 开启目标 provider 的定时
    const target = await prisma.backupConfig.findFirst({
      where: { userId: session.user.id, provider },
    });

    if (!target) {
      return NextResponse.json({ error: "请先配置该仓库" }, { status: 400 });
    }

    await prisma.backupConfig.update({
      where: { id: target.id },
      data: {
        scheduleEnabled: true,
        scheduleTime: target.scheduleTime || getNextSunday20(),
      },
    });

    // 刷新定时器（只触发一次）
    await refreshUserSchedule(session.user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

function getNextSunday20(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);
  sunday.setHours(20, 0, 0, 0);
  return sunday;
}
