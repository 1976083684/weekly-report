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
  token: z.string().min(1, "请输入 Access Token"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const configs = await prisma.backupConfig.findMany({
    where: { userId: session.user.id },
    select: { id: true, provider: true, repoUrl: true, branch: true, path: true },
  });

  return NextResponse.json({ configs });
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

    if (existing) {
      await prisma.backupConfig.update({
        where: { id: existing.id },
        data: {
          repoUrl: data.repoUrl,
          branch: data.branch,
          path: data.path,
          token: encrypt(data.token),
        },
      });
    } else {
      await prisma.backupConfig.create({
        data: {
          userId: session.user.id,
          provider: data.provider,
          repoUrl: data.repoUrl,
          branch: data.branch,
          path: data.path,
          token: encrypt(data.token),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
