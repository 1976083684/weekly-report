import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshUserSchedule } from "@/lib/schedule-runner";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    await refreshUserSchedule(session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
