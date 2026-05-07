import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const name = z.string().min(1).max(20).parse(body.name);

    const tag = await prisma.tag.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!tag) {
      return NextResponse.json({ error: "标签不存在" }, { status: 404 });
    }

    const updated = await prisma.tag.update({
      where: { id },
      data: { name },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const tag = await prisma.tag.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!tag) {
    return NextResponse.json({ error: "标签不存在" }, { status: 404 });
  }

  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
