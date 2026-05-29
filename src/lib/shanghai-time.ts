/** 获取当前上海时间，格式：2026-05-27 10:00:00 */
export function nowShanghai(): string {
  return formatShanghai(new Date());
}

/** 将 Date 转为上海时间字符串，格式：2026-05-27 10:00:00 */
export function formatShanghai(d: Date): string {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/** 计算 N 天前的上海时间字符串，用于日志清理比较 */
export function daysAgoShanghai(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return formatShanghai(d);
}
