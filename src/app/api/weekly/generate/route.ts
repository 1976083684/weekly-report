import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateWeekly } from "@/lib/weekly";
import { z } from "zod";

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  diaryIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { startDate, endDate, diaryIds } = schema.parse(body);
    const data = await generateWeekly(session.user.id, startDate, endDate, diaryIds);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
