import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "密码至少8位")
    .regex(/[a-zA-Z]/, "密码需包含字母")
    .regex(/[0-9]/, "密码需包含数字"),
  name: z.string().min(1, "请输入昵称").max(30, "昵称最多30字").optional(),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, "手机号格式不正确"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const email = data.email || null;
    const phone = data.phone;

    // 检查手机号唯一性
    const existingPhone = await prisma.user.findUnique({
      where: { phone },
    });
    if (existingPhone) {
      return NextResponse.json({ error: "该手机号已注册" }, { status: 409 });
    }

    // 如果提供了邮箱，检查邮箱唯一性
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        phone,
        name: data.name || phone,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, phone: user.phone },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
