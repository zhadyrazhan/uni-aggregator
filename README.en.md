*[Русская версия — [README.md](README.md)]*

# UniGuide — University Aggregator

Module 2 "AI-Native App Sprint" project. A university aggregator: browse/filter a catalog
of universities and their admission requirements (works with zero AI), plus an optional AI
assistant that helps pick, explain, and compare universities using real tool calls against the
same catalog.

**Project:** #3 — Агрегатор университетов (see `Групповой_проект.pdf`).

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS |
| Backend | Next.js API Route Handlers (`src/app/api/**`) — no separate server |
| Database | Prisma ORM 6 + SQLite (`prisma/dev.db`, seeded, zero external accounts needed) |
| AI | OpenAI SDK (Node), hand-rolled tool-calling loop (no LangChain `AgentExecutor`) |
| Testing | Vitest (unit) + Playwright (e2e) |

## Requirement → file mapping

| Requirement | Where |
|---|---|
| Direct LLM API calls | `openai.OpenAI().chat.completions.create(...)` — [`src/lib/ai/agent.ts`](src/lib/ai/agent.ts) |
| Custom tool-calling loop (no `AgentExecutor`) | `runAgent()` — [`src/lib/ai/agent.ts`](src/lib/ai/agent.ts) |
| ≥3 tools, backed by real data | 4 tools in [`src/lib/ai/tools.ts`](src/lib/ai/tools.ts), all querying [`src/lib/universities.ts`](src/lib/universities.ts) |
| Multi-tool calling (comparisons) | Agent calls `get_university_details` once per university being compared — see `src/lib/ai/prompt.ts` rule 2 |
| Custom memory + compaction | `AgentMemory` — [`src/lib/ai/memory.ts`](src/lib/ai/memory.ts), backed by `ChatSession`/`ChatMessage` in `prisma/schema.prisma` |
| Retry / error handling | `callWithRetry()` — [`src/lib/ai/agent.ts`](src/lib/ai/agent.ts) |
| Site works with zero AI | `src/app/page.tsx` + `src/app/universities/[id]/page.tsx` are Server Components that never import `src/lib/ai/*`; `ChatPanel` is a dismissible widget |
| No plain HTML/CSS design | Tailwind + shared components — `src/components/*` |
| `ai-rules/<role>_<name>.md` | [`ai-rules/`](ai-rules/) (4 files) |
| Autotests | [`tests/unit/`](tests/unit) (Vitest), [`tests/e2e/`](tests/e2e) (Playwright) |
| Workflow doc + Reflection | [`WORKFLOW.en.md`](WORKFLOW.en.md) |

## Setup

Requires Node.js (v20+; built and tested on v26) and npm — already installed on this machine,
nothing else is required.

```bash
npm install
cp .env.example .env   # then edit .env and add your real OPENAI_API_KEY
npx prisma migrate dev # first time only — creates prisma/dev.db
npm run db:seed        # seeds 20 universities + admission requirements
npm run dev            # http://localhost:3000
```

> Use `http://localhost:3000`, not `http://127.0.0.1:3000` — Next.js 16's dev-mode cross-origin
> protection blocks the JS bundle on `127.0.0.1` by default, which silently breaks all
> client-side interactivity (filters, chat) with no visible error on the page itself.

Without a valid `OPENAI_API_KEY`, everything except the chat widget works normally; the chat
widget shows a clear error message instead of crashing.

## Testing

```bash
npm run test         # Vitest unit tests (tool functions, query/filter logic)
npx playwright install chromium   # one-time browser download
npm run test:e2e     # Playwright e2e (browsing works without AI, chat panel)
npm run build        # production build + typecheck
npm run lint
```

## Deploying (Vercel or Netlify)

Both hosts run Next.js as serverless/edge functions with a read-only filesystem except `/tmp`
— `src/lib/db.ts` already accounts for this (see below), so the steps for either platform are
nearly identical.

**Vercel:**
1. `npx vercel` (or connect the GitHub repo in the Vercel dashboard) and log in when prompted.
2. Set the `OPENAI_API_KEY` and `DATABASE_URL=file:./dev.db` environment variables in the
   project settings.
3. Deploy.

**Netlify:**
1. In the Netlify dashboard: "Add new site" → "Import an existing project" → GitHub →
   `uni-aggregator`, branch `main`.
2. Netlify auto-detects Next.js and uses `@netlify/plugin-nextjs` with zero extra config (no
   `netlify.toml` needed). Make sure the build command is `npm run build` (not a bare
   `next build`), since `package.json` already chains
   `prisma migrate deploy && tsx prisma/seed.ts` in front of `next build`.
3. In Site settings → Environment variables, set `OPENAI_API_KEY` and
   `DATABASE_URL=file:./dev.db`.
4. Deploy.

Either way, the build command (`npm run build`) applies migrations and reseeds the catalog
before building, so `prisma/dev.db` is freshly generated at build time — it's gitignored, not
committed. `next.config.ts` sets `outputFileTracingIncludes` so that generated file gets bundled
into the serverless functions.

**How chat works on serverless.** `AgentMemory` (`src/lib/ai/memory.ts`) writes a
`ChatSession`/`ChatMessage` row on every turn — the bundled `prisma/dev.db` won't do for that,
since it's read-only. `src/lib/db.ts` handles this without guessing about the host: on the first
database access at runtime it does a real write-probe (`fs.accessSync(path, W_OK)`) on whatever
file `DATABASE_URL` points at. If it's writable, nothing changes (local dev, or a self-hosted
deploy with a real persistent DB). If the file exists but is read-only (a serverless function's
bundle), it copies the seeded DB into `/tmp/dev.db` once per cold start and opens the Prisma
client against that copy via the `datasourceUrl` option — no query code changes.
> Two earlier versions of this check guessed about the host instead of testing the real
> condition: first `process.env.NETLIFY`/`VERCEL` (turned out not to be set in Netlify's function
> runtime, only at build time — the first chat message on the live deploy failed with
> `SQLITE_READONLY`), then `NODE_ENV === "production"` (fixed Netlify, but code review correctly
> pointed out it would break a self-hosted deploy with a real persistent DB). See
> [`WORKFLOW.md`](WORKFLOW.md)'s Reflection section for the full story.

**One thing to know about `/tmp`:** it's ephemeral, per function instance — chats started there
don't survive a cold start (fine for a class project) and aren't shared across parallel function
instances. If you need durable chat history later, point `DATABASE_URL` at a hosted Postgres
(Vercel Postgres, Neon) or Turso/libSQL and rerun `npx prisma migrate deploy` — no application
code changes needed, since every query already goes through `src/lib/db.ts` and
`src/lib/universities.ts`.

## Known npm audit note

`npm audit` flags a high-severity advisory in `deepmerge-ts`, a transitive dependency of
Prisma's own CLI config parser. It's exploitable via a maliciously deep object passed into that
parser — this project only ever feeds it our own trusted `schema.prisma`/config, not user input,
so it's not a real risk here. Fixing it requires downgrading Prisma to a pre-release build
(`npm audit fix --force` suggests `6.12.0-dev`), which isn't worth the instability trade for a
dev-only advisory.
