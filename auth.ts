// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma"; // <--- ИЗМЕНЕНО: прямой путь вместо @lib
import authConfig from "./auth.config";
import { consumeImpersonateToken } from "./app/api/admin/impersonate/route";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  trustHost: true,
  cookies: {
    sessionToken: {
      name: `authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: undefined,
      },
    },
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || user.isDeleted) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        const now = new Date();
        const needsActivation = !user.hasLoggedIn || !user.accessExpiresAt || user.accessExpiresAt < now;

        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            hasLoggedIn: true,
            lastLoginAt: now,
            ...(needsActivation && { accessExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) })
          },
        });

        if (needsActivation) {
          console.log(`Пользователь ${user.email} активирован. Таймер запущен.`);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || "Без имени",
          role: user.role as string,
          monthlyLimit: Number(user.monthlyLimit),
          currentSpent: Number(user.currentSpent),
          accessExpiresAt: user.accessExpiresAt ? user.accessExpiresAt.toISOString() : null,
          offerVersion: user.offerVersion || null,
          privacyVersion: user.privacyVersion || null,
          isDeleted: user.isDeleted,
          originalAdminId: undefined,
        };
      },
    }),
    Credentials({
      id: "impersonate",
      name: "Impersonate",
      credentials: {
        token: { label: "Token", type: "text" },
        adminId: { label: "Admin ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;

        const result = consumeImpersonateToken(credentials.token as string);
        if (!result) return null;

        const user = await prisma.user.findUnique({
          where: { id: result.targetUserId }
        });
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name || "Без имени",
          role: user.role as string,
          monthlyLimit: Number(user.monthlyLimit),
          currentSpent: Number(user.currentSpent),
          accessExpiresAt: user.accessExpiresAt ? user.accessExpiresAt.toISOString() : null,
          offerVersion: user.offerVersion || null,
          privacyVersion: user.privacyVersion || null,
          isDeleted: user.isDeleted,
          originalAdminId: result.isReturn ? undefined : (credentials.adminId as string),
        };
      },
    })
  ],
  secret: process.env.AUTH_SECRET,
});