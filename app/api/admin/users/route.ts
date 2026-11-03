// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { auth } from "@auth";
import { prisma } from "@lib/prisma";
import { randomBytes } from "node:crypto";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    };
    return entities[char];
  });
}

function generatePassword(): string {
  return randomBytes(18).toString("base64url").slice(0, 16);
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !Number.isInteger(port) || !user || !pass) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  return nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass },
  });
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Не авторизован" }, { status: 401 }) };
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isDeleted: true },
  });

  if (!admin || admin.isDeleted || admin.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Доступ запрещён" }, { status: 403 }) };
  }

  return { admin };
}

export async function GET() {
  try {
    const access = await requireAdmin();
    if ("error" in access) return access.error;

    const users = await prisma.user.findMany({
      where: { OR: [{ hasLoggedIn: true }, { isDeleted: true }] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true,
        monthlyLimit: true, currentSpent: true, accessExpiresAt: true,
        isDeleted: true, lastLoginAt: true, lastLogoutAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Ошибка получения пользователей:", error);
    return NextResponse.json({ error: "Не удалось получить список" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireAdmin();
    if ("error" in access) return access.error;

    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const name = typeof data.name === "string" ? data.name.trim().slice(0, 120) : "";
    const monthlyLimit = data.monthlyLimit;
    const accessHours = data.accessHours ?? 24;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
    }
    if (typeof monthlyLimit !== "number" || !Number.isFinite(monthlyLimit) || monthlyLimit < 0 || monthlyLimit > 1000000000) {
      return NextResponse.json({ error: "Некорректный лимит" }, { status: 400 });
    }
    if (typeof accessHours !== "number" || !Number.isFinite(accessHours) || accessHours <= 0 || accessHours > 8760) {
      return NextResponse.json({ error: "Срок доступа должен быть от 1 до 8760 часов" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    const rawPassword = generatePassword();
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const accessExpiresAt = new Date(Date.now() + accessHours * 60 * 60 * 1000);

    let user;

    if (existingUser) {
      // ПЕРЕПРИГЛАШЕНИЕ: обновляем пароль, сбрасываем флаги, даём новый срок
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          isDeleted: false,
          hasLoggedIn: false,
          emailVerified: new Date(),
          verificationToken: randomBytes(32).toString("hex"),
          accessExpiresAt,
          role: "USER",
          monthlyLimit: Math.round(monthlyLimit * 100) / 100,
          offerVersion: null,
          privacyVersion: null,
        },
        select: { id: true },
      });
    } else {
      // НОВЫЙ ПОЛЬЗОВАТЕЛЬ
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          role: "USER",
          passwordHash,
          monthlyLimit: Math.round(monthlyLimit * 100) / 100,
          currentSpent: 0,
          emailVerified: new Date(),
          verificationToken: randomBytes(32).toString("hex"),
          accessExpiresAt,
          hasLoggedIn: false,
          offerVersion: null,
          privacyVersion: null,
        },
        select: { id: true },
      });
    }

    let invitationSent = false;
    try {
      const transporter = createTransporter();
      const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin;
      const loginUrl = new URL("/login", baseUrl).toString();
      const safeName = escapeHtml(name || "пользователь");

      await transporter.sendMail({
        from: `KoloKol <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Приглашение в KoloKol",
        html: `
          <h2>Здравствуйте, ${safeName}</h2>
          <p>Ваш аккаунт создан.</p>
          <p><strong>Логин:</strong> ${escapeHtml(email)}</p>
          <p><strong>Пароль:</strong> ${escapeHtml(rawPassword)}</p>
          <p><strong>Доступ до:</strong> ${escapeHtml(accessExpiresAt.toLocaleString("ru-RU"))}</p>
          <p><a href="${escapeHtml(loginUrl)}">Войти в систему</a></p>
        `,
      });
      invitationSent = true;
    } catch (error) {
      console.error("Ошибка отправки приглашения:", error);
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      accessExpiresAt,
      invitationSent,
      temporaryPassword: invitationSent ? undefined : rawPassword
    }, { status: 201 });

  } catch (error) {
    console.error("Ошибка создания аккаунта:", error);
    return NextResponse.json({ error: "Не удалось создать аккаунт" }, { status: 500 });
  }
}