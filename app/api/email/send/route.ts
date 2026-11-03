import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const EMAIL_COST = 0.5;
const MAX_CONTACTS = 500;
const MAX_SUBJECT_LENGTH = 250;
const MAX_BODY_LENGTH = 100000;

type SendResult = {
  email: string;
  status: "success" | "error" | "skipped";
  message?: string;
};

class BillingError extends Error {}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
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
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function chargeEmail(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isDeleted: true,
        monthlyLimit: true,
        currentSpent: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new Error("USER_NOT_AVAILABLE");
    }

    if (user.role === "ADMIN") return;

    if (user.monthlyLimit - user.currentSpent < EMAIL_COST) {
      throw new BillingError("INSUFFICIENT_BALANCE");
    }

    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        role: "USER",
        isDeleted: false,
        currentSpent: user.currentSpent,
        monthlyLimit: {
          gte: user.currentSpent + EMAIL_COST,
        },
      },
      data: {
        currentSpent: {
          increment: EMAIL_COST,
        },
      },
    });

    if (updated.count !== 1) {
      throw new BillingError("BALANCE_CHANGED");
    }

    await tx.transaction.create({
      data: {
        userId,
        amount: -EMAIL_COST,
        type: "email",
        description: "Отправка email",
      },
    });
  });
}

async function refundEmail(userId: string, email: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        currentSpent: true,
      },
    });

    if (!user || user.role === "ADMIN") return;

    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        currentSpent: {
          gte: EMAIL_COST,
        },
      },
      data: {
        currentSpent: {
          decrement: EMAIL_COST,
        },
      },
    });

    if (updated.count !== 1) {
      throw new Error("EMAIL_REFUND_FAILED");
    }

    await tx.transaction.create({
      data: {
        userId,
        amount: EMAIL_COST,
        type: "email_refund",
        description: `Возврат за неотправленное письмо: ${email}`,
      },
    });
  });
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Не авторизован" },
      { status: 401 }
    );
  }

  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Некорректные данные запроса" },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const subject = data.subject;
    const messageBody = data.body;
    const contacts = data.contacts;

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      subject.length > MAX_SUBJECT_LENGTH ||
      typeof messageBody !== "string" ||
      !messageBody.trim() ||
      messageBody.length > MAX_BODY_LENGTH ||
      !Array.isArray(contacts) ||
      contacts.length === 0 ||
      contacts.length > MAX_CONTACTS
    ) {
      return NextResponse.json(
        { error: "Проверьте тему, текст и список получателей" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json(
        { error: "Аккаунт недоступен" },
        { status: 403 }
      );
    }

    let transporter: nodemailer.Transporter;

    try {
      transporter = createTransporter();
    } catch {
      return NextResponse.json(
        { error: "Почтовый сервер не настроен" },
        { status: 503 }
      );
    }

    const recipients = new Map<string, string>();

    for (const contact of contacts) {
      const rawEmail =
        contact && typeof contact === "object"
          ? (contact as Record<string, unknown>).email
          : null;

      if (typeof rawEmail !== "string") continue;

      const email = rawEmail.trim().toLowerCase();

      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254) {
        recipients.set(email, email);
      }
    }

    if (recipients.size === 0) {
      return NextResponse.json(
        { error: "В списке нет корректных email-адресов" },
        { status: 400 }
      );
    }

    const results: SendResult[] = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let insufficientBalance = false;

    for (const email of recipients.keys()) {
      if (req.signal.aborted) break;

      const blocked = await prisma.unsubscribe.findUnique({
        where: { email },
        select: { id: true },
      });

      if (blocked) {
        results.push({
          email,
          status: "skipped",
          message: "Адрес находится в стоп-листе",
        });
        skipped++;
        continue;
      }

      let charged = false;

      try {
        await chargeEmail(user.id);
        charged = user.role !== "ADMIN";

        await transporter.sendMail({
          from: `"KoloKol" <${process.env.SMTP_USER}>`,
          to: email,
          subject: subject.trim(),
          text: messageBody,
          html: `<div style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(
            messageBody
          )}</div>`,
        });

        results.push({
          email,
          status: "success",
        });

        sent++;
      } catch (error) {
        if (charged) {
          try {
            await refundEmail(user.id, email);
          } catch (refundError) {
            console.error(
              `Не удалось вернуть средства за ${email}:`,
              refundError
            );
          }
        }

        if (
          error instanceof BillingError ||
          (error instanceof Error &&
            (error.message === "INSUFFICIENT_BALANCE" ||
              error.message === "BALANCE_CHANGED"))
        ) {
          insufficientBalance = true;

          results.push({
            email,
            status: "error",
            message: "Недостаточно средств или баланс изменился",
          });

          failed++;
          break;
        }

        console.error(`Ошибка отправки письма ${email}:`, error);

        results.push({
          email,
          status: "error",
          message: "Не удалось отправить письмо",
        });

        failed++;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    try {
      await prisma.emailBroadcast.create({
        data: {
          userId: user.id,
          subject: subject.trim(),
          totalCount: recipients.size,
          sentCount: sent,
          failedCount: failed,
          skippedCount: skipped,
          details: JSON.stringify(results),
        },
      });
    } catch (error) {
      console.error("Ошибка записи истории рассылки:", error);
    }

    const finalUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        monthlyLimit: true,
        currentSpent: true,
      },
    });

    return NextResponse.json({
      success: true,
      total: recipients.size,
      sent,
      failed,
      skipped,
      totalCost: sent * (user.role === "ADMIN" ? 0 : EMAIL_COST),
      newBalance: finalUser
        ? finalUser.monthlyLimit - finalUser.currentSpent
        : null,
      insufficientBalance,
      details: results,
    });
  } catch (error) {
    console.error("Ошибка API рассылки:", error);

    return NextResponse.json(
      { error: "Не удалось выполнить рассылку" },
      { status: 500 }
    );
  }
}