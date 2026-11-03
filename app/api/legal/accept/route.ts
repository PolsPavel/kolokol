// app/api/legal/accept/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CURRENT_OFFER_VERSION = "2026-10-01";
const CURRENT_PRIVACY_VERSION = "2026-10-01";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Некорректный формат запроса" }, { status: 400 });
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("acceptedOffer" in body) ||
      !("acceptedPrivacy" in body) ||
      body.acceptedOffer !== true ||
      body.acceptedPrivacy !== true
    ) {
      return NextResponse.json(
        { error: "Необходимо подтвердить согласие с офертой и политикой конфиденциальности" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isDeleted: true },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const realIp = req.headers.get("x-real-ip")?.trim();
    const ip = (forwardedFor || realIp || "unknown").slice(0, 64);
    const acceptedAt = new Date();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        offerAcceptedAt: acceptedAt,
        offerVersion: CURRENT_OFFER_VERSION,
        offerAcceptedIp: ip,
        privacyAcceptedAt: acceptedAt,
        privacyVersion: CURRENT_PRIVACY_VERSION,
      },
    });

    return NextResponse.json({
      success: true,
      offerVersion: CURRENT_OFFER_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
    });
  } catch (error) {
    console.error("Ошибка при принятии документов:", error);
    return NextResponse.json({ error: "Не удалось сохранить принятие документов" }, { status: 500 });
  }
}