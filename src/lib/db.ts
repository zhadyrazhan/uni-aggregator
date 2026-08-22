import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Serverless hosts (Netlify Functions, Vercel) ship a read-only filesystem at runtime except
 * for /tmp. `prisma/dev.db` is bundled read-only into the function via next.config.ts's
 * outputFileTracingIncludes, but AgentMemory (src/lib/ai/memory.ts) writes a row on every chat
 * turn — so at runtime we copy the bundled (seeded) DB into /tmp once per cold start and point
 * Prisma there instead. Local dev and the build step's own `prisma migrate deploy`/seed run on
 * a normal writable filesystem and are unaffected — they still just use DATABASE_URL directly.
 */
function resolveDatasourceUrl(): string | undefined {
  const isServerless = Boolean(process.env.NETLIFY || process.env.VERCEL);
  if (!isServerless) return undefined; // fall back to schema.prisma's env("DATABASE_URL")

  const writablePath = "/tmp/dev.db";
  if (!fs.existsSync(writablePath)) {
    const bundledPath = path.join(process.cwd(), "prisma", "dev.db");
    try {
      fs.copyFileSync(bundledPath, writablePath);
    } catch (error) {
      throw new Error(
        `Could not find the bundled SQLite DB at ${bundledPath} to copy into ${writablePath}. ` +
          `Check next.config.ts's outputFileTracingIncludes matches this host's function bundle layout. ` +
          `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return `file:${writablePath}`;
}

const datasourceUrl = resolveDatasourceUrl();

export const db =
  globalForPrisma.prisma ?? new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
