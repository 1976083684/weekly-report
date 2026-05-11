import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const promptsSchema = z.object({
  prompts: z.object({
    diary: z.string().optional(),
    report: z.string().optional(),
  }),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const templates = await prisma.promptTemplate.findMany({
    where: { userId: session.user.id },
    select: { type: true, systemPrompt: true },
  });

  const prompts: Record<string, string> = {};
  for (const t of templates) {
    prompts[t.type] = t.systemPrompt;
  }

  return NextResponse.json({ prompts });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = promptsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { prompts } = parsed.data;

  for (const [type, systemPrompt] of Object.entries(prompts)) {
    if (systemPrompt !== undefined) {
      await prisma.promptTemplate.upsert({
        where: { userId_type: { userId: session.user.id, type } },
        create: { userId: session.user.id, type, systemPrompt },
        update: { systemPrompt },
      });
    }
  }

  // Return updated prompts
  const templates = await prisma.promptTemplate.findMany({
    where: { userId: session.user.id },
    select: { type: true, systemPrompt: true },
  });

  const result: Record<string, string> = {};
  for (const t of templates) {
    result[t.type] = t.systemPrompt;
  }

  return NextResponse.json({ prompts: result });
}
