import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const [diaries, weeklies, tags] = await Promise.all([
    prisma.diary.findMany({
      where: { userId: session.user.id },
      include: { tags: { include: { tag: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.weekly.findMany({
      where: { userId: session.user.id },
      orderBy: { startDate: "desc" },
    }),
    prisma.tag.findMany({
      where: { userId: session.user.id },
    }),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    diaries: diaries.map((d) => ({
      title: d.title,
      content: d.content,
      date: d.date.toISOString().slice(0, 10),
      mood: d.mood,
      pinned: d.pinned,
      tags: d.tags.map((t) => t.tag.name),
    })),
    weeklies: weeklies.map((w) => ({
      title: w.title,
      content: w.content,
      startDate: w.startDate.toISOString().slice(0, 10),
      endDate: w.endDate.toISOString().slice(0, 10),
    })),
    tags: tags.map((t) => t.name),
  };

  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": 'attachment; filename="diary-export.json"',
    },
  });
}
