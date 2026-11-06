import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function redirectToLogin(req: Request, status: string) {
  return NextResponse.redirect(
    new URL(`/login?${status}`, req.url)
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return redirectToLogin(req, "error=invalid_token");
  }

  try {
    const result = await prisma.user.updateMany({
      where: {
        verificationToken: token,
        emailVerified: null,
        isDeleted: false,
      },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
      },
    });

    if (result.count !== 1) {
      return redirectToLogin(req, "error=invalid_token");
    }

    return redirectToLogin(req, "verified=true");
  } catch (error) {
    console.error("Ошибка подтверждения email:", error);

    return redirectToLogin(req, "error=verification_failed");
  }
}