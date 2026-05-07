import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { z } from "zod";

const testSchema = z.object({
  provider: z.enum(["github", "gitee"]),
  repoUrl: z.string().min(1, "请输入仓库地址"),
  token: z.string().optional(),
  configId: z.string().optional(),
});

async function testGitee(token: string, owner: string, repo: string) {
  const res = await fetch(
    `https://gitee.com/api/v5/repos/${owner}/${repo}?access_token=${token}`
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error("仓库不存在或无权访问");
    if (res.status === 401) throw new Error("Access Token 无效");
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Gitee API 错误 (${res.status})`);
  }
  const repoInfo = await res.json();
  return {
    fullName: (repoInfo as { full_name?: string; human_name?: string }).full_name || repoInfo.human_name || `${owner}/${repo}`,
    description: (repoInfo as { description?: string }).description || "",
    visibility: (repoInfo as { private?: boolean }).private ? "私有" : "公开",
  };
}

async function testGitHub(token: string, owner: string, repo: string) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("仓库不存在或无权访问");
    if (res.status === 401) throw new Error("Access Token 无效");
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `GitHub API 错误 (${res.status})`);
  }
  const repoInfo = await res.json();
  return {
    fullName: (repoInfo as { full_name: string }).full_name,
    description: (repoInfo as { description?: string | null }).description || "",
    visibility: (repoInfo as { private: boolean }).private ? "私有" : "公开",
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { provider, repoUrl, token: rawToken, configId } = testSchema.parse(body);

    // Resolve token: prefer direct token, fallback to decrypting from saved config
    let token = rawToken;
    if (!token && configId) {
      const config = await prisma.backupConfig.findFirst({
        where: { id: configId, userId: session.user.id },
      });
      if (!config) {
        return NextResponse.json({ error: "备份配置不存在" }, { status: 404 });
      }
      token = decrypt(config.token);
    }
    if (!token) {
      return NextResponse.json({ error: "请输入 Access Token" }, { status: 400 });
    }

    const isGitHub = provider === "github";
    const parsePattern = isGitHub
      ? /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/
      : /gitee\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/;

    const match = repoUrl.match(parsePattern);
    if (!match) {
      return NextResponse.json({ error: "无法解析仓库地址，请检查格式" }, { status: 400 });
    }

    const [owner, repo] = [match[1], match[2]];

    const result = isGitHub
      ? await testGitHub(token, owner, repo)
      : await testGitee(token, owner, repo);

    return NextResponse.json({
      success: true,
      message: `连接成功！仓库：${result.fullName}（${result.visibility}）`,
      repoInfo: result,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({
      error: (err as Error).message || "连接测试失败",
    }, { status: 500 });
  }
}
