// auth.config.ts
import type { NextAuthConfig } from "next-auth";

export default {
  providers: [],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 часа
  },

  pages: {
    signIn: "/login",
  },

  events: {
    async signOut(message) {
      // message.token содержит JWT-токен пользователя при выходе
      if ("token" in message && message.token?.id) {
        try {
          const { prisma } = await import("@/lib/prisma");
          await prisma.user.update({
            where: { id: message.token.id as string },
            data: { lastLogoutAt: new Date() },
          });
        } catch (error) {
          console.error("Ошибка записи времени выхода:", error);
        }
      }
    },
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.monthlyLimit = (user as any).monthlyLimit;
        token.currentSpent = (user as any).currentSpent;
        token.accessExpiresAt = (user as any).accessExpiresAt
          ? (user as any).accessExpiresAt instanceof Date
            ? (user as any).accessExpiresAt.toISOString()
            : (user as any).accessExpiresAt
          : null;
        token.originalAdminId = (user as any).originalAdminId;
        token.offerVersion = (user as any).offerVersion;
        token.privacyVersion = (user as any).privacyVersion;
        token.isDeleted = (user as any).isDeleted || false;
      }

      if (trigger === "update" && session) {
        const s = session as any;
        if (s.offerVersion) token.offerVersion = s.offerVersion;
        if (s.privacyVersion) token.privacyVersion = s.privacyVersion;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).monthlyLimit = token.monthlyLimit;
        (session.user as any).currentSpent = token.currentSpent;
        (session.user as any).accessExpiresAt = (token.accessExpiresAt as string | null) ?? null;
        (session.user as any).originalAdminId = token.originalAdminId as string | undefined;
        (session.user as any).offerVersion = token.offerVersion;
        (session.user as any).privacyVersion = token.privacyVersion;
        (session.user as any).isDeleted = token.isDeleted;
      }
      return session;
    },
  },

  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;