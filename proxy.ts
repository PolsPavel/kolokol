// proxy.ts
import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";

export const { auth: proxy } = NextAuth(authConfig);

export default proxy((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const isDeleted = (req.auth?.user as any)?.isDeleted;
  const accessExpiresAt = (req.auth?.user as any)?.accessExpiresAt;
  const offerVersion = (req.auth?.user as any)?.offerVersion;
  const privacyVersion = (req.auth?.user as any)?.privacyVersion;

  const isDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isAcceptOffer = nextUrl.pathname.startsWith("/accept-offer");

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isDashboard && isLoggedIn) {
    const isExpired = accessExpiresAt && new Date(accessExpiresAt) < new Date();
    if (isDeleted || (role !== "ADMIN" && isExpired)) {
      const response = NextResponse.redirect(new URL("/login", nextUrl));
      response.cookies.delete("authjs.session-token");
      response.cookies.delete("next-auth.session-token");
      return response;
    }
  }

  if (isLoggedIn && role !== "ADMIN") {
    if (!offerVersion || !privacyVersion) {
      if (isDashboard) {
        return NextResponse.redirect(new URL("/accept-offer", nextUrl));
      }
    } else {
      if (isAcceptOffer) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/accept-offer"],
};