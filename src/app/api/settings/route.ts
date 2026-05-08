import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      image: true,
      accounts: {
        select: { provider: true, providerAccountId: true },
      },
    },
  });

  return NextResponse.json({ user });
}

// PUT - 更新个人信息（手机号等）
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phone } = body;

    if (phone !== undefined && phone !== null && phone !== "") {
      // 检查手机号是否已被其他用户绑定
      const existing = await prisma.user.findFirst({
        where: { phone, NOT: { id: session.user.id } },
      });
      if (existing) {
        return NextResponse.json({ error: "该手机号已被其他用户绑定" }, { status: 409 });
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone: phone || null,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        image: true,
      },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE account
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { confirm } = await request.json();
  if (confirm !== "确认删除") {
    return NextResponse.json({ error: "请输入'确认删除'确认操作" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ success: true });
}
