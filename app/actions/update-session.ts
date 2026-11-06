"use server";

import { unstable_update } from "@/auth";
import type { Session } from "next-auth";

export async function updateSessionAction(data: Partial<Session["user"]>) {
  await unstable_update({ user: data });
}