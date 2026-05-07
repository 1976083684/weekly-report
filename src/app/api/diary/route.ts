import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDiaries, createDiary } from "@/lib/diary";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "请输入标题").max(200, "标题最多200字"),
  content: z.string().min(1, "请输入内容"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式不正确"),
  mood: z.enum(["happy", "calm", "normal", "sad", "awful"]).optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const data = await getDiaries({
    userId: session.user.id,
    search: searchParams.get("search") || undefined,
    tagId: searchParams.get("tagId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    page: Number(searchParams.get("page")) || 1,
    pageSize: Number(searchParams.get("pageSize")) || 20,
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
    const diary = await createDiary({ ...data, userId: session.user.id });
    return NextResponse.json(diary, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
