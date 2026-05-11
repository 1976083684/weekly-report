import type { NextAuthConfig } from "next-auth";

const GiteeProvider = {
  id: "gitee",
  name: "Gitee",
  type: "oauth" as const,
  authorization: {
    url: "https://gitee.com/oauth/authorize",
    params: { scope: "user_info" },
  },
  token: "https://gitee.com/oauth/token",
  userinfo: {
    url: "https://gitee.com/api/v5/user",
    async request({ tokens, provider }: { tokens: { access_token: string }; provider: { userinfo?: { url?: string } } }) {
      const url = `${provider.userinfo?.url}?access_token=${tokens.access_token}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "authjs" },
      });
      return res.json();
    },
  },
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

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    // GitHub 和 Gitee OAuth（Edge 兼容）
    {
      id: "github-provider",
      name: "GitHub",
      type: "oauth",
      authorization: "https://github.com/login/oauth/authorize",
      token: "https://github.com/login/oauth/access_token",
      userinfo: "https://api.github.com/user",
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      profile(profile: { id: number; login: string; name: string; avatar_url: string; email?: string }) {
        return {
          id: String(profile.id),
          name: profile.name || profile.login,
          email: profile.email || `${profile.login}@github.user`,
          image: profile.avatar_url,
        };
      },
    },
    GiteeProvider,
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
