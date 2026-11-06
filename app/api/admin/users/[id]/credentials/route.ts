// app/api/admin/users/[id]/credentials/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, temporaryPassword: true, accessExpiresAt: true },
  });

  if (!user || !user.temporaryPassword) {
    return NextResponse.json({ error: "Пароль не найден" }, { status: 404 });
  }

  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Данные для входа в KoloKol"],
    [],
    ["Логин (Email):", user.email],
    ["Пароль:", user.temporaryPassword],
    ["Срок действия доступа:", user.accessExpiresAt ? new Date(user.accessExpiresAt).toLocaleString("ru-RU") : "не ограничен"],
    [],
    ["Вы можете использовать эти данные для входа."],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Доступы");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Kolokol_${user.email}.xlsx"`,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, temporaryPassword: true },
  });

  if (!user || !user.temporaryPassword) {
    return NextResponse.json({ error: "Пароль не найден" }, { status: 404 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `KoloKol <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Ваши доступы к KoloKol",
      html: `
        <h2>Здравствуйте!</h2>
        <p>Ваш аккаунт создан в сервисе KoloKol.</p>
        <p><strong>Логин:</strong> ${user.email}</p>
        <p><strong>Пароль:</strong> ${user.temporaryPassword}</p>
        <p>Вы можете войти по этой ссылке: <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login">Войти</a></p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка отправки доступов:", error);
    return NextResponse.json({ error: "Не удалось отправить письмо" }, { status: 500 });
  }
}