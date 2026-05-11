import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toLocalDateStr } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const [diaries, weeklies, tags, backupConfigs, aiModels] = await Promise.all([
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
    prisma.backupConfig.findMany({
      where: { userId: session.user.id },
    }),
    prisma.aIModel.findMany({
      where: { userId: session.user.id },
    }),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    diaries: diaries.map((d) => ({
      title: d.title,
      content: d.content,
      date: toLocalDateStr(d.date),
      type: d.type,
      mood: d.mood,
      pinned: d.pinned,
      tags: d.tags.map((t) => t.tag.name),
    })),
    weeklies: weeklies.map((w) => ({
      title: w.title,
      content: w.content,
      startDate: toLocalDateStr(w.startDate),
      endDate: toLocalDateStr(w.endDate),
    })),
    tags: tags.map((t) => t.name),
    backupConfigs: backupConfigs.map((c) => ({
      provider: c.provider,
      repoUrl: c.repoUrl,
      branch: c.branch,
      path: c.path,
      token: c.token,
    })),
    aiModels: aiModels.map((m) => ({
      provider: m.provider,
      modelName: m.modelName,
      apiKey: m.apiKey,
      baseUrl: m.baseUrl,
      website: m.website,
      notes: m.notes,
      haikuModel: m.haikuModel,
      sonnetModel: m.sonnetModel,
      opusModel: m.opusModel,
      configJson: m.configJson,
      isActive: m.isActive,
    })),
  };

  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": 'attachment; filename="diary-export.json"',
    },
  });
}
