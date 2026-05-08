import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { pushToGitHub, parseGitHubUrl } from "@/lib/github";
import { pushToGitee, parseGiteeUrl } from "@/lib/gitee";
import { toLocalDateStr } from "@/lib/utils";

function hardBreaks(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n\n/)
    .map((para) => para.replace(/\n/g, "  \n"))
    .join("\n\n");
}

function formatDiary(diary: {
  title: string;
  content: string;
  date: Date;
  mood?: string | null;
}): string {
  const moodMap: Record<string, string> = {
    happy: "😊 开心",
    calm: "😌 平静",
    normal: "😐 一般",
    sad: "😢 低落",
    awful: "😞 难过",
  };
  const mood = diary.mood ? `\n心情：${moodMap[diary.mood] || diary.mood}` : "";
  return `# ${diary.title}\n日期：${toLocalDateStr(diary.date)}${mood}\n\n${hardBreaks(diary.content)}\n`;
}

function formatDailyReport(report: {
  title: string;
  content: string;
  date: Date;
}): string {
  return `# ${report.title}\n日期：${toLocalDateStr(report.date)}\n\n${hardBreaks(report.content)}\n`;
}

function formatWeekly(weekly: {
  title: string;
  content: string;
}): string {
  return `# ${weekly.title}\n\n${hardBreaks(weekly.content)}\n`;
}

function getDateRange(scope: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (scope === "week") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { dateFrom: monday, weeklyFrom: monday };
  }
  if (scope === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { dateFrom: d, weeklyFrom: d };
  }
  return { dateFrom: undefined, weeklyFrom: undefined };
}

export async function backupToGit(backupConfigId: string, userId: string, scope = "week") {
  const config = await prisma.backupConfig.findFirst({
    where: { id: backupConfigId, userId },
  });

  if (!config) throw new Error("备份配置不存在");

  const token = decrypt(config.token);

  const isGitHub = config.provider === "github";
  const parseFn = isGitHub ? parseGitHubUrl : parseGiteeUrl;
  const pushFn = isGitHub ? pushToGitHub : pushToGitee;

  const repoInfo = parseFn(config.repoUrl);
  if (!repoInfo) throw new Error(`无法解析仓库URL：${config.repoUrl}`);

  const { dateFrom, weeklyFrom } = getDateRange(scope);

  const diaryWhere: Record<string, unknown> = { userId, type: "diary" };
  const reportWhere: Record<string, unknown> = { userId, type: "daily_report" };
  const weeklyWhere: Record<string, unknown> = { userId };
  if (dateFrom) {
    diaryWhere.date = { gte: dateFrom };
    reportWhere.date = { gte: dateFrom };
  }
  if (weeklyFrom) {
    weeklyWhere.startDate = { gte: weeklyFrom };
  }

  const [diaries, dailyReports, weeklies] = await Promise.all([
    prisma.diary.findMany({
      where: diaryWhere,
      orderBy: { date: "desc" },
    }),
    prisma.diary.findMany({
      where: reportWhere,
      orderBy: { date: "desc" },
    }),
    prisma.weekly.findMany({
      where: weeklyWhere,
      orderBy: { startDate: "desc" },
    }),
  ]);

  const results: string[] = [];
  const errors: string[] = [];

  for (const diary of diaries) {
    try {
      const date = toLocalDateStr(diary.date);
      const year = date.slice(0, 4);
      const filePath = `${config.path}diary/${year}/${date}.md`;
      const md = formatDiary(diary);
      const msg = `备份日记: ${diary.title} (${date})`;

      const result = await pushFn({
        token,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        branch: config.branch,
        path: filePath,
        content: md,
        message: msg,
      });

      results.push(`${filePath} -> ${result.sha}`);
    } catch (err) {
      const date = toLocalDateStr(diary.date);
      errors.push(`日记 ${date} 备份失败: ${(err as Error).message}`);
    }
  }

  for (const report of dailyReports) {
    try {
      const date = toLocalDateStr(report.date);
      const year = date.slice(0, 4);
      const filePath = `${config.path}daily-report/${year}/${date}.md`;
      const md = formatDailyReport(report);
      const msg = `备份日报: ${date}`;

      const result = await pushFn({
        token,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        branch: config.branch,
        path: filePath,
        content: md,
        message: msg,
      });

      results.push(`${filePath} -> ${result.sha}`);
    } catch (err) {
      const date = toLocalDateStr(report.date);
      errors.push(`日报 ${date} 备份失败: ${(err as Error).message}`);
    }
  }

  for (const weekly of weeklies) {
    try {
      const start = toLocalDateStr(weekly.startDate);
      const end = toLocalDateStr(weekly.endDate);
      const startParts = start.split("-");
      const endDay = end.split("-")[2];
      const filePath = `${config.path}weekly/${startParts[0]}/${start}~${endDay}.md`;
      const md = formatWeekly({ title: weekly.title, content: weekly.content });
      const msg = `备份周报: ${weekly.title}`;

      const result = await pushFn({
        token,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        branch: config.branch,
        path: filePath,
        content: md,
        message: msg,
      });

      results.push(`${filePath} -> ${result.sha}`);
    } catch (err) {
      errors.push(`周报 ${weekly.title} 备份失败: ${(err as Error).message}`);
    }
  }

  const status = errors.length === 0 ? "success" : "failed";
  const message =
    errors.length === 0
      ? `成功备份 ${results.length} 个文件`
      : `${results.length} 个成功，${errors.length} 个失败：${errors.join("; ")}`;

  return { status, message, results, errors };
}
