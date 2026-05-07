import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { pushToGitHub, parseGitHubUrl } from "@/lib/github";
import { pushToGitee, parseGiteeUrl } from "@/lib/gitee";

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
  return `# ${diary.title}\n\n日期：${diary.date.toISOString().slice(0, 10)}${mood}\n\n${diary.content}`;
}

function formatWeekly(weekly: {
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
}): string {
  const start = weekly.startDate.toISOString().slice(0, 10);
  const end = weekly.endDate.toISOString().slice(0, 10);
  return `# ${weekly.title}\n\n日期：${start} ~ ${end}\n\n${weekly.content}`;
}

export async function backupToGit(backupConfigId: string, userId: string) {
  const config = await prisma.backupConfig.findFirst({
    where: { id: backupConfigId, userId },
  });

  if (!config) throw new Error("备份配置不存在");

  const token = decrypt(config.token);

  // Determine parser and pusher
  const isGitHub = config.provider === "github";
  const parseFn = isGitHub ? parseGitHubUrl : parseGiteeUrl;
  const pushFn = isGitHub ? pushToGitHub : pushToGitee;

  const repoInfo = parseFn(config.repoUrl);
  if (!repoInfo) throw new Error(`无法解析仓库URL：${config.repoUrl}`);

  // Get all diaries and weeklies
  const [diaries, weeklies] = await Promise.all([
    prisma.diary.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    }),
    prisma.weekly.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const results: string[] = [];
  const errors: string[] = [];

  // Push diary files
  for (const diary of diaries) {
    try {
      const date = diary.date.toISOString().slice(0, 10);
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
      const date = diary.date.toISOString().slice(0, 10);
      errors.push(`日记 ${date} 备份失败: ${(err as Error).message}`);
    }
  }

  // Push weekly files
  for (const weekly of weeklies) {
    try {
      const start = weekly.startDate.toISOString().slice(0, 10);
      const year = start.slice(0, 4);
      const filePath = `${config.path}weekly/${year}/W${year}-${start.replace(/-/g, "")}.md`;
      const md = formatWeekly(weekly);
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
