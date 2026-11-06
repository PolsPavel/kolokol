// app/api/reports/data/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SendResult = { email: string; status: "success" | "skipped"; };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  try {
    const [user, transactions, broadcasts] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { isDeleted: true } }),
      prisma.transaction.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
      prisma.emailBroadcast.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
    ]);

    if (!user || user.isDeleted) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

    const broadcastRows = broadcasts.map((item) => {
      let details: SendResult[] = [];
      if (item.details) {
        try { const parsed = JSON.parse(item.details); if (Array.isArray(parsed)) details = parsed.filter((r: any) => r.status === "success" || r.status === "skipped"); } catch (e) { console.error("Ошибка парсинга:", e); }
      }

      const broadcastTime = new Date(item.createdAt).getTime();
      const relatedTransactions = transactions.filter(t => {
        if (t.type !== "email" && t.type !== "email_refund") return false;
        const tTime = new Date(t.createdAt).getTime();
        return Math.abs(tTime - broadcastTime) < 5 * 60 * 1000;
      });

      return {
        id: item.id,
        date: item.createdAt.toISOString(),
        type: "email_broadcast",
        amount: 0,
        description: item.subject,
        source: "email",
        totalCost: item.sentCount * 0.5,
        relatedTransactions,
        details: { total: item.totalCount, sent: item.sentCount, results: details },
      };
    });

    const linkedTxIds = new Set(broadcastRows.flatMap(b => b.relatedTransactions.map(t => t.id)));
    const standaloneTransactions = transactions.filter(t => !linkedTxIds.has(t.id)).map((item) => ({
      id: item.id, date: item.createdAt.toISOString(), type: item.type, amount: item.amount, description: item.description, source: "financial", relatedTransactions: [], details: null,
    }));

    const allRows = [...standaloneTransactions, ...broadcastRows].sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json(allRows);
  } catch (error) {
    console.error("Ошибка получения данных отчета:", error);
    return NextResponse.json({ error: "Не удалось получить данные" }, { status: 500 });
  }
}