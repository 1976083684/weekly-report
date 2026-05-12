import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { backupToGit } from "@/lib/backup";

/** Compute the next Sunday 23:00 local time */
function nextSunday23(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);
  sunday.setHours(23, 0, 0, 0);
  return sunday;
}

function nextMonth23(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(23, 0, 0, 0);
  return d;
}

function computeNextTime(scope: string): Date {
  if (scope === "month") return nextMonth23();
  if (scope === "all") {
    // "all" scope: run once per week, same as week
    return nextSunday23();
  }
  return nextSunday23();
}

export async function GET() {
  const now = new Date();

  try {
    // Find all enabled schedules that are due
    const dues = await prisma.backupConfig.findMany({
      where: {
        scheduleEnabled: true,
        scheduleTime: { lte: now },
      },
    });

    const results: { configId: string; provider: string; status: string; message: string }[] = [];

    for (const config of dues) {
      try {
        const scope = config.scheduleScope || "week";
        const { status, message } = await backupToGit(config.id, config.userId, scope);

        // Update last run and next schedule time
        const nextTime = computeNextTime(scope);
        await prisma.backupConfig.update({
          where: { id: config.id },
          data: {
            scheduleLastRun: now,
            scheduleTime: nextTime,
          },
        });

        // Log the backup
        await prisma.backupLog.create({
          data: {
            userId: config.userId,
            configId: config.id,
            status,
            message: `[定时备份] ${message}`,
          },
        });

        results.push({ configId: config.id, provider: config.provider, status, message });
      } catch (err) {
        results.push({
          configId: config.id,
          provider: config.provider,
          status: "error",
          message: (err as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      checked: dues.length,
      results,
      serverTime: now.toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message,
    }, { status: 500 });
  }
}
