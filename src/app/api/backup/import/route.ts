import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { parseGitHubUrl } from "@/lib/github";
import { parseGiteeUrl } from "@/lib/gitee";
import {
  parseDiaryMarkdown,
  parseDailyReportMarkdown,
  parseWeeklyMarkdown,
  parseWeeklyPath,
} from "@/lib/import-parser";

interface RepoContent {
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string;
  encoding?: string;
}

type Provider = "github" | "gitee";

function apiBase(provider: Provider, owner: string, repo: string) {
  if (provider === "github") return `https://api.github.com/repos/${owner}/${repo}`;
  return `https://gitee.com/api/v5/repos/${owner}/${repo}`;
}

function fetchHeaders(provider: Provider, token: string): Record<string, string> {
  if (provider === "github") {
    return {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    };
  }
  return {};
}

function contentsUrl(provider: Provider, base: string, path: string, token: string, branch: string) {
  if (provider === "github") {
    return `${base}/contents/${path}?ref=${branch}`;
  }
  return `${base}/contents/${path}?access_token=${token}&ref=${branch}`;
}

async function fetchContent(
  provider: Provider, token: string, owner: string, repo: string, path: string, branch: string
) {
  const base = apiBase(provider, owner, repo);
  const url = contentsUrl(provider, base, path, token, branch);
  const headers = fetchHeaders(provider, token);
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function listDir(
  provider: Provider, token: string, owner: string, repo: string, path: string, branch: string
): Promise<RepoContent[]> {
  const data = await fetchContent(provider, token, owner, repo, path, branch);
  if (Array.isArray(data)) return data;
  return [];
}

async function getFileContent(
  provider: Provider, token: string, owner: string, repo: string, path: string, branch: string
): Promise<string | null> {
  const data = await fetchContent(provider, token, owner, repo, path, branch);
  if (!data || !data.content || data.encoding !== "base64") return null;
  return Buffer.from(data.content, "base64").toString("utf-8");
}

async function findMdFiles(
  provider: Provider, token: string, owner: string, repo: string,
  dirPath: string, branch: string,
): Promise<string[]> {
  const results: string[] = [];
  const entries = await listDir(provider, token, owner, repo, dirPath, branch);

  for (const entry of entries) {
    if (entry.type === "file" && entry.name.endsWith(".md")) {
      results.push(entry.path);
    } else if (entry.type === "dir") {
      const sub = await findMdFiles(provider, token, owner, repo, entry.path, branch);
      results.push(...sub);
    }
  }
  return results;
}

function parseRepoUrl(provider: Provider, url: string) {
  if (provider === "github") return parseGitHubUrl(url);
  return parseGiteeUrl(url);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { configId, scope = "all" } = body;

    if (!configId) {
      return NextResponse.json({ error: "请提供备份配置 ID" }, { status: 400 });
    }

    const config = await prisma.backupConfig.findFirst({
      where: { id: configId, userId },
    });

    if (!config) {
      return NextResponse.json({ error: "备份配置不存在" }, { status: 404 });
    }

    if (config.provider !== "github" && config.provider !== "gitee") {
      return NextResponse.json({ error: "不支持的备份服务商" }, { status: 400 });
    }

    const provider: Provider = config.provider;
    const token = decrypt(config.token);
    const repoInfo = parseRepoUrl(provider, config.repoUrl);
    if (!repoInfo) {
      return NextResponse.json({ error: "无法解析仓库 URL" }, { status: 400 });
    }

    const { owner, repo } = repoInfo;
    const branch = config.branch || "main";
    const basePath = config.path || "diary/";

    // 1. Discover all .md files
    const diaryPath = `${basePath}diary`.replace(/\/$/, "");
    const reportPath = `${basePath}daily-report`.replace(/\/$/, "");
    const weeklyPath = `${basePath}weekly`.replace(/\/$/, "");

    const [diaryFiles, reportFiles, weeklyFiles] = await Promise.all([
      findMdFiles(provider, token, owner, repo, diaryPath, branch).catch(() => [] as string[]),
      findMdFiles(provider, token, owner, repo, reportPath, branch).catch(() => [] as string[]),
      findMdFiles(provider, token, owner, repo, weeklyPath, branch).catch(() => [] as string[]),
    ]);

    const allMdFiles = [
      ...diaryFiles.map((f) => ({ path: f, kind: "diary" as const })),
      ...reportFiles.map((f) => ({ path: f, kind: "daily_report" as const })),
      ...weeklyFiles.map((f) => ({ path: f, kind: "weekly" as const })),
    ];

    // Filter by scope
    if (scope !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (scope === "week") cutoff.setDate(now.getDate() - 7);
      else if (scope === "month") cutoff.setDate(now.getDate() - 30);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      const filtered: typeof allMdFiles = [];
      for (const f of allMdFiles) {
        if (f.kind === "weekly") {
          filtered.push(f);
          continue;
        }
        const datePart = f.path.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
        if (datePart && datePart >= cutoffStr) filtered.push(f);
      }
      allMdFiles.length = 0;
      allMdFiles.push(...filtered);
    }

    if (allMdFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "未找到可导入的文件",
        imported: 0,
        skipped: 0,
        details: "备份仓库中没有匹配的 Markdown 文件。",
      });
    }

    // 2. Fetch and parse each file, then import
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const file of allMdFiles) {
      try {
        const md = await getFileContent(provider, token, owner, repo, file.path, branch);
        if (!md) {
          skipped++;
          continue;
        }

        if (file.kind === "diary") {
          const parsed = parseDiaryMarkdown(md);
          if (!parsed) { skipped++; continue; }

          const date = new Date(parsed.date + "T00:00:00.000Z");
          const existing = await prisma.diary.findFirst({
            where: { userId, date, title: parsed.title },
          });
          if (existing) { skipped++; continue; }

          await prisma.diary.create({
            data: { userId, title: parsed.title, content: parsed.content, date, type: "diary", mood: parsed.mood ?? null },
          });
          imported++;
        } else if (file.kind === "daily_report") {
          const parsed = parseDailyReportMarkdown(md);
          if (!parsed) { skipped++; continue; }

          const date = new Date(parsed.date + "T00:00:00.000Z");
          const existing = await prisma.diary.findFirst({
            where: { userId, date, title: parsed.title },
          });
          if (existing) { skipped++; continue; }

          await prisma.diary.create({
            data: { userId, title: parsed.title, content: parsed.content, date, type: "daily_report" },
          });
          imported++;
        } else if (file.kind === "weekly") {
          const dates = parseWeeklyPath(file.path);
          if (!dates) { skipped++; continue; }

          const parsed = parseWeeklyMarkdown(md, dates.startDate, dates.endDate);
          if (!parsed) { skipped++; continue; }

          const startDate = new Date(parsed.startDate + "T00:00:00.000Z");
          const existing = await prisma.weekly.findFirst({
            where: { userId, startDate, title: parsed.title },
          });
          if (existing) { skipped++; continue; }

          await prisma.weekly.create({
            data: {
              userId,
              title: parsed.title,
              content: parsed.content,
              startDate,
              endDate: new Date(parsed.endDate + "T00:00:00.000Z"),
            },
          });
          imported++;
        }
      } catch (err) {
        errors.push(`${file.path}: ${(err as Error).message}`);
        skipped++;
      }
    }

    const detailParts: string[] = [];
    if (imported > 0) detailParts.push(`成功导入 ${imported} 条`);
    if (skipped > 0) detailParts.push(`跳过 ${skipped} 条（已存在或格式不符）`);
    if (errors.length > 0) detailParts.push(`${errors.length} 个文件解析失败`);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 10),
      message: detailParts.join("；"),
      details: `共扫描 ${allMdFiles.length} 个文件。${detailParts.join("；")}`,
    });
  } catch (err) {
    return NextResponse.json({
      error: `导入失败：${(err as Error).message}`,
    }, { status: 500 });
  }
}
