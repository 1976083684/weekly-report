import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toLocalDateStr, parseLocalDate } from "@/lib/utils";

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

  const mondayStr = toLocalDateStr(monday);
  const sundayStr = toLocalDateStr(sunday);

  // 年度范围 — 最新年份使用滚动365天，往年使用自然年
  const isCurrentYear = year === now.getFullYear();
  let yearStart: Date;
  let yearEnd: Date;
  if (isCurrentYear) {
    yearEnd = new Date();
    yearStart = new Date(now);
    yearStart.setDate(now.getDate() - 365);
  } else {
    yearStart = new Date(year, 0, 1);
    yearEnd = new Date(year, 11, 31);
  }

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
      where: { userId, date: { gte: parseLocalDate(mondayStr), lte: parseLocalDate(sundayStr) } },
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
        diary: { userId, date: { gte: parseLocalDate(mondayStr), lte: parseLocalDate(sundayStr) } },
      },
      include: { tag: true },
    }),
  ]);

  // 本周每天日记数
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(toLocalDateStr(d));
  }

  const weekDailyCount = weekDates.map((d) => ({
    date: d,
    count: weekDiaries.filter((e) => toLocalDateStr(e.date) === d).length,
  }));

  // 本周活跃天数
  const activeDays = weekDailyCount.filter((d) => d.count > 0).length;

  // 年度活跃度数据（按日统计，用于热力图）
  const yearDateMap = new Map<string, number>();
  for (const diary of yearDiaries) {
    const dateKey = toLocalDateStr(diary.date);
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

  // 月度汇总
  const monthLabels: string[] = [];
  const cursor = new Date(yearStart);
  cursor.setDate(1);
  while (cursor <= yearEnd) {
    monthLabels.push(`${cursor.getMonth() + 1}月`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const monthCounts = new Array(monthLabels.length).fill(0);
  const startMonth = yearStart.getFullYear() * 12 + yearStart.getMonth();

  for (const diary of yearDiaries) {
    const diaryMonth = diary.date.getFullYear() * 12 + diary.date.getMonth();
    const idx = diaryMonth - startMonth;
    if (idx >= 0 && idx < monthCounts.length) {
      monthCounts[idx]++;
    }
  }

  const totalDiariesInRange = yearDiaries.length;

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
    monthLabels,
    totalDiariesInRange,
    isCurrentYear,
    recentDiaries: recentDiaries.map((d) => ({
      id: d.id,
      title: d.title,
      date: toLocalDateStr(d.date),
      tags: d.tags.map((dt) => ({ id: dt.tag.id, name: dt.tag.name })),
    })),
  });
}
