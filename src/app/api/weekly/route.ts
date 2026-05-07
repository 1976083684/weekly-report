import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWeeklies, createWeekly } from "@/lib/weekly";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "请输入标题").max(200),
  content: z.string().min(1, "请输入内容"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const data = await getWeeklies({
    userId: session.user.id,
    search: searchParams.get("search") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    pageSize: (searchParams.get("startDate") || searchParams.get("endDate")) ? 50 : 20,
  });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);
    const weekly = await createWeekly({ ...data, userId: session.user.id });
    return NextResponse.json(weekly, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
