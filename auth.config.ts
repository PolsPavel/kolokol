// auth.config.ts
import type { NextAuthConfig } from "next-auth";
import { prisma } from "./lib/prisma";

export default {
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.monthlyLimit = user.monthlyLimit;
        token.currentSpent = user.currentSpent;
        token.accessExpiresAt = user.accessExpiresAt
          ? (user.accessExpiresAt instanceof Date ? user.accessExpiresAt.toString() : user.accessExpiresAt)
          : null;
        token.originalAdminId = user.originalAdminId;
        token.offerVersion = user.offerVersion;
        token.privacyVersion = user.privacyVersion;
        token.isDeleted = (user as any).isDeleted || false;
      }
      
      // Обработка обновления сессии
      if (trigger === "update" && session) {
        if (session.offerVersion) token.offerVersion = session.offerVersion;
        if (session.privacyVersion) token.privacyVersion = session.privacyVersion;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { isDeleted: true, accessExpiresAt: true }
          });
          
          if (!dbUser || dbUser.isDeleted) {
            return null as any;
          }
          
          if (token.role !== "ADMIN" && dbUser.accessExpiresAt && dbUser.accessExpiresAt < new Date()) {
            return null as any;
          }
        } catch (e) {
          console.error("Ошибка проверки сессии:", e);
        }
        
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.monthlyLimit = token.monthlyLimit as number;
        session.user.currentSpent = token.currentSpent as number;
        session.user.accessExpiresAt = token.accessExpiresAt as string | null;
        session.user.originalAdminId = token.originalAdminId as string | undefined;
        (session.user as any).offerVersion = token.offerVersion;
        (session.user as any).privacyVersion = token.privacyVersion;
        (session.user as any).isDeleted = token.isDeleted;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;