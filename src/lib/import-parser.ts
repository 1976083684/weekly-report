/**
 * Parse backup markdown files back into structured data for reverse import.
 *
 * File naming conventions (from backup.ts):
 *   diary/{year}/{date}.md       — type: "diary"
 *   daily-report/{year}/{date}.md — type: "daily_report"
 *   weekly/{year}/{start}~{endDay}.md — weekly
 */

interface ParsedDiary {
  title: string;
  content: string;
  date: string;      // YYYY-MM-DD
  type: string;
  mood?: string;
}

interface ParsedWeekly {
  title: string;
  content: string;
  startDate: string;
  endDate: string;
}

const MOOD_REVERSE: Record<string, string> = {
  "😊 开心": "happy",
  "😌 平静": "calm",
  "😐 一般": "normal",
  "😢 低落": "sad",
  "😞 难过": "awful",
};

function detectMood(md: string): string | undefined {
  const m = md.match(/^心情：(.+)$/m);
  if (!m) return undefined;
  return MOOD_REVERSE[m[1].trim()] || m[1].trim();
}

function parseTitle(md: string): { title: string; body: string } {
  const titleMatch = md.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "未命名";
  const body = titleMatch
    ? md.replace(titleMatch[0], "").trim()
    : md.trim();
  return { title, body };
}

function parseDateFromBody(body: string): { date: string; remaining: string } {
  const m = body.match(/^日期：(\d{4}-\d{2}-\d{2})/m);
  const date = m ? m[1] : "";
  const remaining = m ? body.replace(m[0], "").trim() : body;
  return { date, remaining };
}

export function parseDiaryMarkdown(md: string): ParsedDiary | null {
  const { title, body } = parseTitle(md);
  const { date, remaining } = parseDateFromBody(body);
  if (!date) return null;

  const mood = detectMood(body);
  const contentBody = remaining
    .replace(/^心情：.+\n?/m, "")
    .replace(/  \n/g, "\n")  // reverse hardBreaks
    .trim();

  return { title, content: contentBody, date, type: "diary", mood };
}

export function parseDailyReportMarkdown(md: string): ParsedDiary | null {
  const { title, body } = parseTitle(md);
  const { date, remaining } = parseDateFromBody(body);
  if (!date) return null;

  const contentBody = remaining
    .replace(/  \n/g, "\n")
    .trim();

  return { title, content: contentBody, date, type: "daily_report" };
}

export function parseWeeklyMarkdown(
  md: string,
  startDate: string,
  endDate: string
): ParsedWeekly | null {
  const { title, body } = parseTitle(md);

  const contentBody = body
    .replace(/  \n/g, "\n")
    .trim();

  return { title, content: contentBody, startDate, endDate };
}

/**
 * Extract startDate from a weekly file path like "weekly/2025/2025-03-03~09.md"
 */
export function parseWeeklyPath(filePath: string): { startDate: string; endDate: string } | null {
  const base = filePath.replace(/\.md$/, "").split("/").pop() || "";
  const m = base.match(/^(\d{4}-\d{2}-\d{2})~(\d{2})$/);
  if (!m) return null;
  const startDate = m[1];
  const endDay = m[2];
  const parts = startDate.split("-");
  const endDate = `${parts[0]}-${parts[1]}-${endDay}`;
  // Validate
  if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) return null;
  return { startDate, endDate };
}
