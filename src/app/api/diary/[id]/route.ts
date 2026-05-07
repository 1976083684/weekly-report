import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getDiaryById,
  updateDiary,
  deleteDiary,
  togglePinDiary,
} from "@/lib/diary";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1, "请输入标题").max(200).optional(),
  content: z.string().min(1, "请输入内容").optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  mood: z
    .enum(["happy", "calm", "normal", "sad", "awful"])
    .nullable()
    .optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const diary = await getDiaryById(id, session.user.id);
  if (!diary) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }

  return NextResponse.json(diary);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);
    const diary = await updateDiary(id, session.user.id, data);
    if (!diary) {
      return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    }
    return NextResponse.json(diary);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteDiary(id, session.user.id);
  if (!ok) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const diary = await togglePinDiary(id, session.user.id);
  if (!diary) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }

  return NextResponse.json(diary);
}
