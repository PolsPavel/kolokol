import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const configuredUrl = process.env.DATABASE_URL || "file:./dev.db";

const dbUrl = configuredUrl.startsWith("file:")
  ? path.isAbsolute(configuredUrl.slice(5))
    ? configuredUrl
    : `file:${path.resolve(
        /* turbopackIgnore: true */
        process.cwd(),
        configuredUrl.slice(5),
      )}`
  : configuredUrl;

const adapter = new PrismaBetterSqlite3({ url: dbUrl });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}