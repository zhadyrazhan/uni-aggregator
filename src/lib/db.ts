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
 * Prisma there instead.
 *
 * This is gated on an actual filesystem write-probe of the resolved DATABASE_URL file, not on a
 * guess about the hosting platform. Two prior versions guessed instead and both shipped broken:
 * checking NETLIFY/VERCEL env vars (Netlify doesn't set that in the function runtime, only at
 * build time — the live deploy's first chat message failed with SQLITE_READONLY), then checking
 * NODE_ENV==="production" (which also fires for a self-hosted/Docker deploy with a real,
 * writable, persistent DATABASE_URL, silently discarding it in favor of ephemeral /tmp data —
 * caught in code review, not by any test). Probing the actual file sidesteps guessing platform
 * behavior entirely: local dev and any host with a genuinely writable DB just use it unchanged;
 * only a bundled read-only file triggers the /tmp copy.
 */
function resolveDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("file:")) return undefined; // non-SQLite datasource (Postgres/Turso/etc.) — nothing to redirect

  const target = url.slice("file:".length);
  const resolvedPath = path.isAbsolute(target)
    ? target
    : path.resolve(process.cwd(), "prisma", target);

  if (!fs.existsSync(resolvedPath)) return undefined; // not created yet, e.g. before the first `prisma migrate dev` — let Prisma's own error surface

  try {
    fs.accessSync(resolvedPath, fs.constants.W_OK);
    return undefined; // writable in place — local dev, or a self-hosted deploy with a real persistent DB
  } catch {
    // read-only — bundled into a serverless function; fall through to the /tmp copy below
  }

  const writablePath = "/tmp/dev.db";
  if (!fs.existsSync(writablePath)) {
    try {
      fs.copyFileSync(resolvedPath, writablePath);
      // copyFileSync can preserve the source file's mode bits (confirmed on macOS, where it
      // uses a clone-on-write syscall) — a read-only source would produce an equally read-only
      // /tmp copy, silently defeating this whole function. Force it writable explicitly rather
      // than trust copy behavior that isn't guaranteed consistent across platforms.
      fs.chmodSync(writablePath, 0o600);
    } catch (error) {
      throw new Error(
        `Found a read-only SQLite DB at ${resolvedPath} but could not copy a writable version to ${writablePath}. ` +
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
