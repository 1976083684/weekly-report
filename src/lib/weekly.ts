import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseLocalDate } from "@/lib/utils";

export async function getWeeklies({
  userId,
  search,
  startDate,
  endDate,
  page = 1,
  pageSize = 20,
}: {
  userId: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const where: Prisma.WeeklyWhereInput = { userId };

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  if (startDate) {
    where.startDate = parseLocalDate(startDate);
  }
  if (endDate) {
    where.endDate = parseLocalDate(endDate);
  }

  const [weeklies, total] = await Promise.all([
    prisma.weekly.findMany({
      where,
      orderBy: { startDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.weekly.count({ where }),
  ]);

  return { weeklies, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getWeeklyById(weeklyId: string, userId: string) {
  return prisma.weekly.findFirst({
    where: { id: weeklyId, userId },
  });
}

export async function createWeekly(data: {
  userId: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
}) {
  return prisma.weekly.create({
    data: {
      userId: data.userId,
      title: data.title,
      content: data.content,
      startDate: parseLocalDate(data.startDate),
      endDate: parseLocalDate(data.endDate),
    },
  });
}

export async function updateWeekly(
  weeklyId: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const weekly = await prisma.weekly.findFirst({
    where: { id: weeklyId, userId },
  });
  if (!weekly) return null;

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.startDate !== undefined) updateData.startDate = parseLocalDate(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = parseLocalDate(data.endDate);

  return prisma.weekly.update({
    where: { id: weeklyId },
    data: updateData,
  });
}

export async function deleteWeekly(weeklyId: string, userId: string) {
  const weekly = await prisma.weekly.findFirst({
    where: { id: weeklyId, userId },
  });
  if (!weekly) return false;
  await prisma.weekly.delete({ where: { id: weeklyId } });
  return true;
}

export async function generateWeekly(
  userId: string,
  startDate: string,
  endDate: string,
  diaryIds?: string[]
) {
  const where: Prisma.DiaryWhereInput = { userId };

  if (diaryIds && diaryIds.length > 0) {
    where.id = { in: diaryIds };
  } else {
    where.date = {
      gte: parseLocalDate(startDate),
      lte: parseLocalDate(endDate),
    };
  }

  const diaries = await prisma.diary.findMany({
    where,
    orderBy: { date: "asc" },
    include: { tags: { include: { tag: true } } },
  });

  const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  // Group diaries by weekday
  const byWeekday = new Map<string, typeof diaries>();
  for (const diary of diaries) {
    const date = new Date(diary.date);
    const dayOfWeek = date.getDay();
    const label = weekDays[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
    if (!byWeekday.has(label)) byWeekday.set(label, []);
    byWeekday.get(label)!.push(diary);
  }

  const lines: string[] = [
    `# 周报 ${startDate} ~ ${endDate}`,
    "",
  ];

  if (diaries.length > 0) {
    for (const label of weekDays) {
      const items = byWeekday.get(label);
      if (items && items.length > 0) {
        for (const diary of items) {
          const excerpt = diary.content
            .replace(/[#*`\->]/g, "")
            .trim();
          lines.push(`${label}：`);
          lines.push(excerpt || diary.title);
          lines.push("");
        }
      } else {
        lines.push(`${label}：`);
        lines.push("");
      }
    }
  } else {
    for (const label of weekDays) {
      lines.push(`${label}：`);
      lines.push("");
    }
  }

  lines.push("## 本周反思");
  lines.push("");
  lines.push("");
  lines.push("## 下周计划");
  lines.push("");

  return {
    title: `周报 ${startDate} ~ ${endDate}`,
    content: lines.join("\n"),
    startDate,
    endDate,
  };
}
