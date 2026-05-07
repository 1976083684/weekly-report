import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ids = z.array(z.string()).min(1).parse(body.ids);

    // Verify all tags belong to user
    const tags = await prisma.tag.findMany({
      where: { id: { in: ids }, userId: session.user.id },
    });

    if (tags.length !== ids.length) {
      return NextResponse.json({ error: "部分标签不存在" }, { status: 400 });
    }

    // Delete DiaryTag relations first, then tags
    await prisma.diaryTag.deleteMany({
      where: { tagId: { in: ids } },
    });
    await prisma.tag.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
