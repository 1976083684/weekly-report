import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseLocalDate } from "@/lib/utils";

export type DiaryWithTags = Prisma.DiaryGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

export async function getDiaries({
  userId,
  search,
  tagId,
  dateFrom,
  dateTo,
  type,
  page = 1,
  pageSize = 20,
}: {
  userId: string;
  search?: string;
  tagId?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}) {
  const where: Prisma.DiaryWhereInput = { userId };

  if (type) where.type = type;

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  if (tagId) {
    where.tags = { some: { tagId } };
  }

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = parseLocalDate(dateFrom);
    if (dateTo) where.date.lte = parseLocalDate(dateTo);
  }

  const [diaries, total] = await Promise.all([
    prisma.diary.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: [{ pinned: "desc" }, { date: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.diary.count({ where }),
  ]);

  return { diaries, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getDiaryById(diaryId: string, userId: string) {
  return prisma.diary.findFirst({
    where: { id: diaryId, userId },
    include: { tags: { include: { tag: true } } },
  });
}

export async function createDiary(data: {
  userId: string;
  title: string;
  content: string;
  date: string;
  type?: string;
  mood?: string | null;
  tagIds?: string[];
}) {
  return prisma.diary.create({
    data: {
      userId: data.userId,
      title: data.title,
      content: data.content,
      date: parseLocalDate(data.date),
      type: data.type,
      mood: data.mood,
      tags: data.tagIds?.length
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });
}

export async function updateDiary(
  diaryId: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    date?: string;
    mood?: string | null;
    tagIds?: string[];
  }
) {
  const diary = await prisma.diary.findFirst({ where: { id: diaryId, userId } });
  if (!diary) return null;

  if (data.tagIds !== undefined) {
    await prisma.diaryTag.deleteMany({ where: { diaryId } });
    if (data.tagIds.length > 0) {
      await prisma.diaryTag.createMany({
        data: data.tagIds.map((tagId) => ({ diaryId, tagId })),
      });
    }
  }

  return prisma.diary.update({
    where: { id: diaryId },
    data: {
      title: data.title,
      content: data.content,
      date: data.date ? parseLocalDate(data.date) : undefined,
      mood: data.mood,
    },
    include: { tags: { include: { tag: true } } },
  });
}

export async function deleteDiary(diaryId: string, userId: string) {
  const diary = await prisma.diary.findFirst({ where: { id: diaryId, userId } });
  if (!diary) return false;
  await prisma.diary.delete({ where: { id: diaryId } });
  return true;
}

export async function togglePinDiary(diaryId: string, userId: string) {
  const diary = await prisma.diary.findFirst({ where: { id: diaryId, userId } });
  if (!diary) return null;
  return prisma.diary.update({
    where: { id: diaryId },
    data: { pinned: !diary.pinned },
  });
}
