import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = request.nextUrl;
  const year = Number(searchParams.get("year")) || new Date().getFullYear();

  // 本周范围
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const mondayStr = monday.toISOString().split("T")[0];
  const sundayStr = sunday.toISOString().split("T")[0];

  // 年度范围
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  // 并行查询
  const [
    totalDiaries,
    totalWeeklies,
    totalTags,
    weekDiaries,
    yearDiaries,
    recentDiaries,
    tagCountsData,
  ] = await Promise.all([
    prisma.diary.count({ where: { userId } }),
    prisma.weekly.count({ where: { userId } }),
    prisma.tag.count({ where: { userId } }),
    prisma.diary.findMany({
      where: { userId, date: { gte: new Date(mondayStr), lte: new Date(sundayStr) } },
      select: { date: true, id: true },
    }),
    prisma.diary.findMany({
      where: { userId, date: { gte: yearStart, lte: yearEnd } },
      select: { date: true },
      orderBy: { date: "asc" },
    }),
    prisma.diary.findMany({
      where: { userId },
      select: { id: true, title: true, date: true, tags: { include: { tag: true } } },
      orderBy: { date: "desc" },
      take: 6,
    }),
    prisma.diaryTag.findMany({
      where: {
        diary: { userId, date: { gte: new Date(mondayStr), lte: new Date(sundayStr) } },
      },
      include: { tag: true },
    }),
  ]);

  // 本周每天日记数
  const weekDays = ["一", "二", "三", "四", "五", "六", "日"];
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split("T")[0]);
  }

  const weekDailyCount = weekDates.map((d) => ({
    date: d,
    count: weekDiaries.filter((e) => e.date.toISOString().split("T")[0] === d).length,
  }));

  // 本周活跃天数
  const activeDays = weekDailyCount.filter((d) => d.count > 0).length;

  // 年度活跃度数据（按日统计，用于热力图）
  const yearDateMap = new Map<string, number>();
  for (const diary of yearDiaries) {
    const dateKey = diary.date.toISOString().split("T")[0];
    yearDateMap.set(dateKey, (yearDateMap.get(dateKey) || 0) + 1);
  }
  const activityData = Array.from(yearDateMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // 标签统计
  const tagCountMap = new Map<string, { id: string; name: string; count: number }>();
  for (const dt of tagCountsData) {
    const t = dt.tag;
    const existing = tagCountMap.get(t.id);
    if (existing) {
      existing.count++;
    } else {
      tagCountMap.set(t.id, { id: t.id, name: t.name, count: 1 });
    }
  }
  const topTags = Array.from(tagCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 年度汇总（按月统计）
  const monthCounts = new Array(12).fill(0);
  for (const diary of yearDiaries) {
    const m = diary.date.getMonth();
    monthCounts[m]++;
  }

  return NextResponse.json({
    stats: {
      totalDiaries,
      totalWeeklies,
      totalTags,
      weekDiaryCount: weekDiaries.length,
      activeDays,
    },
    weekDailyCount,
    activityData,
    topTags,
    monthCounts,
    recentDiaries: recentDiaries.map((d) => ({
      id: d.id,
      title: d.title,
      date: d.date.toISOString().split("T")[0],
      tags: d.tags.map((dt) => ({ id: dt.tag.id, name: dt.tag.name })),
    })),
  });
}
