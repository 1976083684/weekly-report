import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { z } from "zod";

const configSchema = z.object({
  provider: z.enum(["github", "gitee"]),
  repoUrl: z.string().url("请输入有效的仓库地址"),
  branch: z.string().min(1).default("main"),
  path: z.string().min(1).default("diary/"),
  token: z.string().optional(),
  scheduleEnabled: z.boolean().optional(),
  scheduleScope: z.enum(["week", "month", "all"]).optional(),
  scheduleTime: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const configs = await prisma.backupConfig.findMany({
    where: { userId: session.user.id },
    select: { id: true, provider: true, repoUrl: true, branch: true, path: true, token: true, scheduleEnabled: true, scheduleScope: true, scheduleTime: true, scheduleLastRun: true },
  });

  const result = configs.map((c) => ({
    id: c.id,
    provider: c.provider,
    repoUrl: c.repoUrl,
    branch: c.branch,
    path: c.path,
    hasToken: !!c.token,
    scheduleEnabled: c.scheduleEnabled,
    scheduleScope: c.scheduleScope,
    scheduleTime: c.scheduleTime?.toISOString() ?? null,
    scheduleLastRun: c.scheduleLastRun?.toISOString() ?? null,
  }));

  return NextResponse.json({ configs: result });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = configSchema.parse(body);

    const existing = await prisma.backupConfig.findFirst({
      where: { userId: session.user.id, provider: data.provider },
    });

    // For update: if no new token, keep the old one
    // For create: token is required
    let encryptedToken: string;
    if (data.token) {
      encryptedToken = encrypt(data.token);
    } else if (existing) {
      encryptedToken = existing.token;
    } else {
      return NextResponse.json({ error: "首次配置请填写 Access Token" }, { status: 400 });
    }

    let configId: string;
    const scheduleData: Record<string, unknown> = {};
    if (data.scheduleEnabled !== undefined) scheduleData.scheduleEnabled = data.scheduleEnabled;
    if (data.scheduleScope !== undefined) scheduleData.scheduleScope = data.scheduleScope;
    if (data.scheduleTime !== undefined) {
      scheduleData.scheduleTime = data.scheduleTime ? new Date(data.scheduleTime) : null;
    }

    if (existing) {
      await prisma.backupConfig.update({
        where: { id: existing.id },
        data: {
          repoUrl: data.repoUrl,
          branch: data.branch,
          path: data.path,
          token: encryptedToken,
          ...scheduleData,
        },
      });
      configId = existing.id;
    } else {
      const created = await prisma.backupConfig.create({
        data: {
          userId: session.user.id,
          provider: data.provider,
          repoUrl: data.repoUrl,
          branch: data.branch,
          path: data.path,
          token: encryptedToken,
          ...scheduleData,
        },
      });
      configId = created.id;
    }

    return NextResponse.json({ success: true, configId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    const message = (err as Error).message || "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
