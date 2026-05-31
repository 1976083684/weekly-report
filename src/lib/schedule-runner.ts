import { prisma } from "@/lib/prisma";
import { backupToGit } from "@/lib/backup";
import { nowShanghai, daysAgoShanghai } from "@/lib/shanghai-time";

const DEFAULT_INTERVAL = 60 * 60 * 1000;
const timers = new Map<string, NodeJS.Timeout>();
const running = new Set<string>();
const timerGeneration = new Map<string, number>(); // 版本号，防止竞态条件

/** 计算下一个周日 20:00 */
function nextSunday20(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);
  sunday.setHours(20, 0, 0, 0);
  return sunday;
}

/** 计算下个月 1 号 23:00 */
function nextMonth23(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(23, 0, 0, 0);
  return d;
}

function computeNextTime(scope: string): Date {
  if (scope === "month") return nextMonth23();
  return nextSunday20();
}

/** 检查单个用户的所有定时备份 */
async function checkUserSchedule(userId: string) {
  const configs = await prisma.backupConfig.findMany({
    where: { userId, scheduleEnabled: true },
  });

  for (const config of configs) {
    const now = new Date();
    const isDue = config.scheduleTime && new Date(config.scheduleTime) <= now;

    if (isDue) {
      if (running.has(config.id)) continue;
      running.add(config.id);
      try {
        const scope = config.scheduleScope || "week";

        // 先推进 scheduleTime，防止并发重复触发
        const nextTime = computeNextTime(scope);
        await prisma.backupConfig.update({
          where: { id: config.id },
          data: { scheduleLastRun: now, scheduleTime: nextTime },
        });

        const { status, message } = await backupToGit(config.id, config.userId, scope);

        await prisma.backupLog.create({
          data: {
            userId: config.userId,
            configId: config.id,
            type: config.provider,
            status,
            message: `[${config.provider}:定时备份] ${message}`,
            createdAt: nowShanghai(),
          },
        });
        console.log(`[定时备份] ${config.provider} 用户${userId} 备份完成: ${status}`);
      } catch (err) {
        console.error(`[定时备份] ${config.provider} 用户${userId} 备份失败:`, (err as Error).message);
      } finally {
        running.delete(config.id);
      }
    } else {
      const nextTimeStr = config.scheduleTime
        ? new Date(config.scheduleTime).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
        : "未设置";
      await prisma.backupLog.create({
        data: {
          userId: config.userId,
          configId: config.id,
          type: config.provider,
          status: "ok",
          message: `[${config.provider}:定时备份] 时间未到，定时任务正常，下次执行：${nextTimeStr}`,
          createdAt: nowShanghai(),
        },
      });
    }
  }
}

/** 清理单个用户 2 天前的定时日志 */
async function cleanUserLogs(userId: string) {
  const twoDaysAgo = daysAgoShanghai(2);
  await prisma.backupLog.deleteMany({
    where: {
      userId,
      OR: [
        { message: { contains: ":定时备份]" } },
        { message: { startsWith: "[定时备份]" } },
      ],
      createdAt: { lt: twoDaysAgo },
    },
  });
}

/** 启动单个用户的定时器 */
async function startUserTimer(userId: string) {
  stopUserTimer(userId);

  const config = await prisma.backupConfig.findFirst({
    where: { userId, scheduleEnabled: true },
    select: { scheduleInterval: true },
  });
  if (!config) return;

  const interval = config.scheduleInterval || DEFAULT_INTERVAL;
  const generation = (timerGeneration.get(userId) || 0) + 1;
  timerGeneration.set(userId, generation);

  async function tick() {
    // 检查版本号，如果已被更新则不再继续
    if (timerGeneration.get(userId) !== generation) {
      console.log(`[定时备份] 用户${userId} 定时器已更新，停止旧定时器 (gen=${generation})`);
      return;
    }

    await cleanUserLogs(userId);
    await checkUserSchedule(userId);

    // 再次检查版本号（await 期间可能被更新）
    if (timerGeneration.get(userId) !== generation) {
      console.log(`[定时备份] 用户${userId} 定时器已更新，停止旧定时器 (gen=${generation})`);
      return;
    }

    // 重新读取最新间隔（用户可能修改了）
    const latest = await prisma.backupConfig.findFirst({
      where: { userId, scheduleEnabled: true },
      select: { scheduleInterval: true },
    });
    if (latest) {
      const newInterval = latest.scheduleInterval || DEFAULT_INTERVAL;
      console.log(`[定时备份] 用户${userId} 下次检查间隔: ${newInterval}ms (scheduleInterval=${latest.scheduleInterval})`);
      timers.set(userId, setTimeout(tick, newInterval));
    } else {
      console.log(`[定时备份] 用户${userId} 未找到启用的配置，定时器停止`);
    }
  }

  timers.set(userId, setTimeout(tick, interval));
}

/** 停止单个用户的定时器 */
function stopUserTimer(userId: string) {
  const t = timers.get(userId);
  if (t) {
    clearTimeout(t);
    timers.delete(userId);
  }
}

/** 启动所有已开启定时备份的用户 */
export async function startSchedule() {
  const users = await prisma.backupConfig.findMany({
    where: { scheduleEnabled: true },
    select: { userId: true },
    distinct: ["userId"],
  });
  for (const u of users) {
    startUserTimer(u.userId);
  }
  console.log(`[定时备份] 已启动 ${users.length} 个用户的定时任务`);
}

/** 刷新单个用户的定时器（配置变更后调用） */
export async function refreshUserSchedule(userId: string) {
  const hasEnabled = await prisma.backupConfig.findFirst({
    where: { userId, scheduleEnabled: true },
    select: { id: true },
  });
  if (hasEnabled) {
    await startUserTimer(userId);
  } else {
    stopUserTimer(userId);
  }
}

/** 移除单个用户的定时器 */
export function removeUserSchedule(userId: string) {
  stopUserTimer(userId);
}
