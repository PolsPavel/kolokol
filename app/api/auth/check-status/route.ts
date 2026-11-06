// app/api/auth/check-status/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ active: false, reason: "unauthenticated" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isDeleted: true },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json({ active: false, reason: "deleted" }, { status: 403 });
    }

    return NextResponse.json({ active: true });
  } catch (error) {
    console.error("Ошибка проверки статуса:", error);
    return NextResponse.json({ active: true }); // при ошибке БД не выкидываем
  }
}