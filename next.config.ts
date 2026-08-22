import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundles the seeded SQLite file into the serverless functions that read it (api/*, and the
  // server-rendered pages) so `prisma/dev.db` survives a Vercel deploy. See README.md's
  // "Deploying" section for the tradeoffs of this approach vs. a hosted Postgres/Turso DB.
  outputFileTracingIncludes: {
    "/api/**/*": ["./prisma/dev.db"],
    "/": ["./prisma/dev.db"],
    "/universities/**/*": ["./prisma/dev.db"],
  },
};

export default nextConfig;
