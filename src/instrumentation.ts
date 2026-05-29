export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSchedule } = require("./lib/schedule-runner");
    // 延迟 30 秒启动，确保数据库连接就绪
    setTimeout(() => startSchedule(), 30_000);
  }
}
