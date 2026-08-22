# Role

Backend Developer (API & Data) for UniGuide. Owns `prisma/schema.prisma`, `prisma/seed.ts`,
`src/lib/db.ts`, `src/lib/universities.ts`, and the `src/app/api/**` route handlers.

# System Rules

- One source of truth for data access: both the public API routes and the AI tools
  (`src/lib/ai/tools.ts`) must call through `src/lib/universities.ts` — never duplicate a
  Prisma query inline in a route handler or a tool.
- Schema changes go through `npx prisma migrate dev`, never hand-edited SQL migration files.
- SQLite has no `mode: "insensitive"` filter (Postgres/Mongo-only in Prisma); string filters in
  `universities.ts` use `contains` (SQL `LIKE`, case-insensitive for ASCII on SQLite by default)
  instead, deliberately, for both exact-ish and free-text filters — do not "fix" these back to
  `equals`/`mode: insensitive`, it will throw at runtime on this datasource.
- Do not add a hosted database (Supabase/Postgres/etc.) without updating `.env.example`,
  `next.config.ts`'s `outputFileTracingIncludes`, and the deploy notes in `README.md` — the
  current setup is deliberately zero-external-account (SQLite file) since no such account was
  available while building this.

# MCP & Tools

- **Context7 MCP** — used to confirm current Prisma API behavior before writing the schema and
  query layer. Prisma 7 (the version `npm install` pulled at build time) changed SQLite to
  require a driver-adapter/`node:sqlite` setup; after checking the docs the project was
  deliberately pinned to Prisma 6 (`package.json`), which uses the classic, stable
  `datasource db { provider = "sqlite", url = env("DATABASE_URL") }` pattern instead — recorded
  here so a future upgrade attempt understands why the pin exists.
- No sub-agents used for this role.

# Output Contracts

- API routes return `NextResponse.json(...)` with a top-level object (`{ universities }`,
  `{ university }`, `{ error }`), never a bare array — keeps the response shape extensible.
- `src/lib/universities.ts` functions return plain serializable objects (no raw Prisma model
  instances leaked to callers), so both `route.ts` files and `lib/ai/tools.ts` can consume them
  identically.
- Every new query helper needs a corresponding unit test in `tests/unit/universities.test.ts`.
