// types/next-auth.d.ts
import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    monthlyLimit?: number;
    currentSpent?: number;
    accessExpiresAt?: string | null;
    originalAdminId?: string;
    offerVersion?: string | null;
    privacyVersion?: string | null;
    isDeleted?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role?: string;
      monthlyLimit?: number;
      currentSpent?: number;
      accessExpiresAt?: string | null;
      originalAdminId?: string;
      offerVersion?: string | null;
      isDeleted?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    monthlyLimit?: number;
    currentSpent?: number;
    accessExpiresAt?: string | null;
    originalAdminId?: string;
    offerVersion?: string | null;
    privacyVersion?: string | null;
    isDeleted?: boolean;
  }
}