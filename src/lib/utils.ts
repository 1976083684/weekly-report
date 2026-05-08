import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 将 Date 对象格式化为 YYYY-MM-DD 字符串，使用服务器本地时区（北京时区 UTC+8） */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** 返回当前本地日期字符串 YYYY-MM-DD */
export function todayStr(): string {
  return toLocalDateStr(new Date())
}

/** 将 YYYY-MM-DD 字符串解析为本地午间 Date 对象，避免 UTC 零点造成的日期偏移 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00")
}
