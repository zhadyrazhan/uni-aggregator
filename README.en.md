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

## Deploying (Vercel)

1. `npx vercel` (or connect the GitHub repo in the Vercel dashboard) and log in when prompted.
2. Set the `OPENAI_API_KEY` and `DATABASE_URL=file:./dev.db` environment variables in the
   Vercel project settings.
3. Deploy. `npm run build` (what Vercel runs) applies migrations and reseeds the catalog before
   building (`prisma migrate deploy && tsx prisma/seed.ts && next build`), so `prisma/dev.db`
   is freshly generated at build time — it's gitignored, not committed. `next.config.ts` sets
   `outputFileTracingIncludes` so that generated file gets bundled into the serverless functions
   that read it at request time.

**Open item before deploying:** the catalog is read-only at request time and deploys as-is, but
the chat needs one fix first. `AgentMemory` (`src/lib/ai/memory.ts`) writes a
`ChatSession`/`ChatMessage` row on every turn, and the bundled `prisma/dev.db` sits on a
read-only filesystem on Vercel — so until that fix lands, the first chat message fails with
`SQLITE_READONLY` while the browse pages keep working. Resolved by copying the DB to `/tmp` on
cold start, or by pointing `DATABASE_URL` at a hosted Postgres (Vercel Postgres, Neon) or
Turso/libSQL and rerunning `npx prisma migrate deploy`. No application code changes either way,
since all queries go through `src/lib/db.ts` and `src/lib/universities.ts`.

## Known npm audit note

`npm audit` flags a high-severity advisory in `deepmerge-ts`, a transitive dependency of
Prisma's own CLI config parser. It's exploitable via a maliciously deep object passed into that
parser — this project only ever feeds it our own trusted `schema.prisma`/config, not user input,
so it's not a real risk here. Fixing it requires downgrading Prisma to a pre-release build
(`npm audit fix --force` suggests `6.12.0-dev`), which isn't worth the instability trade for a
dev-only advisory.
