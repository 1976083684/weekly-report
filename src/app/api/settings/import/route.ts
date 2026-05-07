import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const importSchema = z.object({
  exportedAt: z.string().optional(),
  diaries: z.array(z.object({
    title: z.string().min(1),
    content: z.string().default(""),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式需为 YYYY-MM-DD"),
    type: z.string().optional(),
    mood: z.string().nullable().optional(),
    pinned: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  })).optional().default([]),
  weeklies: z.array(z.object({
    title: z.string().min(1),
    content: z.string().default(""),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请上传 JSON 文件" }, { status: 400 });
    }

    const text = await file.text();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "JSON 格式无效，无法解析" }, { status: 400 });
    }

    const parseResult = importSchema.safeParse(raw);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json({
        error: `数据格式不符：${firstIssue.path.join(".")} - ${firstIssue.message}`,
      }, { status: 400 });
    }

    const data = parseResult.data;
    let tagsImported = 0;
    let diariesImported = 0;
    let diariesSkipped = 0;
    let weekliesImported = 0;
    let weekliesSkipped = 0;

    // 1. Import tags — find or create by name for current user
    const tagNameToId = new Map<string, string>();
    for (const tagName of data.tags) {
      const existing = await prisma.tag.findUnique({
        where: { userId_name: { userId, name: tagName } },
      });
      if (existing) {
        tagNameToId.set(tagName, existing.id);
      } else {
        const created = await prisma.tag.create({
          data: { userId, name: tagName },
        });
        tagNameToId.set(tagName, created.id);
        tagsImported++;
      }
    }

    // 2. Import diaries — skip if same date+title already exists
    for (const diary of data.diaries) {
      const diaryDate = new Date(diary.date + "T00:00:00.000Z");

      const duplicate = await prisma.diary.findFirst({
        where: { userId, date: diaryDate, title: diary.title },
      });
      if (duplicate) {
        diariesSkipped++;
        continue;
      }

      const tagIds = (diary.tags || [])
        .map((name) => tagNameToId.get(name))
        .filter((id): id is string => !!id);

      await prisma.diary.create({
        data: {
          userId,
          title: diary.title,
          content: diary.content,
          date: diaryDate,
          type: diary.type || "diary",
          mood: diary.mood ?? null,
          pinned: diary.pinned ?? false,
          tags: tagIds.length > 0
            ? { create: tagIds.map((tagId) => ({ tagId })) }
            : undefined,
        },
      });
      diariesImported++;
    }

    // 3. Import weeklies — skip if same startDate+title already exists
    for (const weekly of data.weeklies) {
      const startDate = new Date(weekly.startDate + "T00:00:00.000Z");

      const duplicate = await prisma.weekly.findFirst({
        where: { userId, startDate, title: weekly.title },
      });
      if (duplicate) {
        weekliesSkipped++;
        continue;
      }

      await prisma.weekly.create({
        data: {
          userId,
          title: weekly.title,
          content: weekly.content,
          startDate,
          endDate: new Date(weekly.endDate + "T00:00:00.000Z"),
        },
      });
      weekliesImported++;
    }

    return NextResponse.json({
      success: true,
      tagsImported,
      diariesImported,
      diariesSkipped,
      weekliesImported,
      weekliesSkipped,
      message: [
        `标签：${tagsImported} 个新增`,
        `日记：${diariesImported} 篇导入，${diariesSkipped} 篇跳过（重复）`,
        `周报：${weekliesImported} 篇导入，${weekliesSkipped} 篇跳过（重复）`,
      ].join("；"),
    });
  } catch (err) {
    return NextResponse.json({
      error: `导入失败：${(err as Error).message}`,
    }, { status: 500 });
  }
}
