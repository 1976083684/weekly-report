import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const tags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { diaries: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = z.string().min(1).max(20).parse(body.name);

    const existing = await prisma.tag.findFirst({
      where: { userId: session.user.id, name },
    });
    if (existing) {
      return NextResponse.json(existing);
    }

    const tag = await prisma.tag.create({
      data: { name, userId: session.user.id },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
