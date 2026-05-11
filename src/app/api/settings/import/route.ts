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
  backupConfigs: z.array(z.object({
    provider: z.string().min(1),
    repoUrl: z.string().min(1),
    branch: z.string().default("main"),
    path: z.string().default("diary/"),
    token: z.string(),
  })).optional().default([]),
  aiModels: z.array(z.object({
    provider: z.string().min(1),
    modelName: z.string().min(1),
    apiKey: z.string(),
    baseUrl: z.string().min(1),
    website: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    haikuModel: z.string().nullable().optional(),
    sonnetModel: z.string().nullable().optional(),
    opusModel: z.string().nullable().optional(),
    configJson: z.string().nullable().optional(),
    isActive: z.boolean().optional().default(false),
  })).optional().default([]),
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
    let backupsImported = 0;
    let backupsUpdated = 0;
    let modelsImported = 0;
    let modelsUpdated = 0;

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

    // 4. Import backup configs — upsert by userId + provider
    for (const cfg of data.backupConfigs) {
      const existing = await prisma.backupConfig.findUnique({
        where: { userId_provider: { userId, provider: cfg.provider } },
      });
      if (existing) {
        await prisma.backupConfig.update({
          where: { id: existing.id },
          data: {
            repoUrl: cfg.repoUrl,
            branch: cfg.branch,
            path: cfg.path,
            token: cfg.token,
          },
        });
        backupsUpdated++;
      } else {
        await prisma.backupConfig.create({
          data: {
            userId,
            provider: cfg.provider,
            repoUrl: cfg.repoUrl,
            branch: cfg.branch,
            path: cfg.path,
            token: cfg.token,
          },
        });
        backupsImported++;
      }
    }

    // 5. Import AI models — upsert by userId + provider + modelName
    for (const m of data.aiModels) {
      const existing = await prisma.aIModel.findUnique({
        where: {
          userId_provider_modelName: {
            userId,
            provider: m.provider,
            modelName: m.modelName,
          },
        },
      });
      if (existing) {
        await prisma.aIModel.update({
          where: { id: existing.id },
          data: {
            apiKey: m.apiKey,
            baseUrl: m.baseUrl,
            website: m.website ?? null,
            notes: m.notes ?? null,
            haikuModel: m.haikuModel ?? null,
            sonnetModel: m.sonnetModel ?? null,
            opusModel: m.opusModel ?? null,
            configJson: m.configJson ?? null,
            isActive: m.isActive,
          },
        });
        modelsUpdated++;
      } else {
        await prisma.aIModel.create({
          data: {
            userId,
            provider: m.provider,
            modelName: m.modelName,
            apiKey: m.apiKey,
            baseUrl: m.baseUrl,
            website: m.website ?? null,
            notes: m.notes ?? null,
            haikuModel: m.haikuModel ?? null,
            sonnetModel: m.sonnetModel ?? null,
            opusModel: m.opusModel ?? null,
            configJson: m.configJson ?? null,
            isActive: false, // 导入后默认不激活，需手动启用
          },
        });
        modelsImported++;
      }
    }

    const parts: string[] = [];
    if (tagsImported > 0) parts.push(`标签：${tagsImported} 个新增`);
    if (diariesImported > 0 || diariesSkipped > 0) parts.push(`日记：${diariesImported} 篇导入，${diariesSkipped} 篇跳过`);
    if (weekliesImported > 0 || weekliesSkipped > 0) parts.push(`周报：${weekliesImported} 篇导入，${weekliesSkipped} 篇跳过`);
    if (backupsImported > 0) parts.push(`备份配置：${backupsImported} 个新增`);
    if (backupsUpdated > 0) parts.push(`备份配置：${backupsUpdated} 个更新`);
    if (modelsImported > 0) parts.push(`模型配置：${modelsImported} 个新增`);
    if (modelsUpdated > 0) parts.push(`模型配置：${modelsUpdated} 个更新`);

    return NextResponse.json({
      success: true,
      tagsImported,
      diariesImported,
      diariesSkipped,
      weekliesImported,
      weekliesSkipped,
      backupsImported,
      backupsUpdated,
      modelsImported,
      modelsUpdated,
      message: parts.length > 0 ? parts.join("；") : "没有可导入的数据",
    });
  } catch (err) {
    return NextResponse.json({
      error: `导入失败：${(err as Error).message}`,
    }, { status: 500 });
  }
}
