import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWeeklyById, updateWeekly, deleteWeekly } from "@/lib/weekly";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
  const weekly = await getWeeklyById(id, session.user.id);
  if (!weekly) {
    return NextResponse.json({ error: "周报不存在" }, { status: 404 });
  }

  return NextResponse.json(weekly);
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
    const weekly = await updateWeekly(id, session.user.id, data);
    if (!weekly) {
      return NextResponse.json({ error: "周报不存在" }, { status: 404 });
    }
    return NextResponse.json(weekly);
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
  const ok = await deleteWeekly(id, session.user.id);
  if (!ok) {
    return NextResponse.json({ error: "周报不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
