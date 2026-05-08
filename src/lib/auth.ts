import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

const GiteeProvider = {
  id: "gitee",
  name: "Gitee",
  type: "oauth" as const,
  authorization: "https://gitee.com/oauth/authorize",
  token: "https://gitee.com/oauth/token",
  userinfo: "https://gitee.com/api/v5/user",
  clientId: process.env.GITEE_ID,
  clientSecret: process.env.GITEE_SECRET,
  profile(profile: { id: number; login: string; name: string; avatar_url: string; email?: string }) {
    return {
      id: String(profile.id),
      name: profile.name || profile.login,
      email: profile.email || `${profile.login}@gitee.user`,
      image: profile.avatar_url,
    };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "邮箱/手机号", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifier = credentials.identifier as string;

        // 支持邮箱或手机号登录
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { phone: identifier },
            ],
          },
        });

        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    GiteeProvider,
  ],
});
