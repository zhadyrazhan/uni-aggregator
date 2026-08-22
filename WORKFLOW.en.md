*[Русская версия — [WORKFLOW.md](WORKFLOW.md)]*

# WORKFLOW.md — UniGuide (University Aggregator)

Module 2 "AI-Native App Sprint" project. Built solo, covering all four spec roles
(Frontend, Backend, AI Engineer, QA/Workflow Master) — see `ai-rules/*_zhadyra.md` for the
per-role rules that governed each part of the build.

## How this was built

Claude Code was used, against an OpenAI API key for the runtime chatbot.
The `ai-rules` files are named according to the project requirements.

**Sequence:**

1. Scaffolded Next.js 16 (App Router, TypeScript, Tailwind) via `create-next-app` and moved the
   result into the existing git repo.
2. Checked Next.js 16 and Prisma docs via **Context7 MCP** before writing any route handlers or
   the schema — both were newer major versions than the assistant's training data, with real
   breaking changes (Prisma 7's SQLite driver-adapter requirement; Next.js 15+ async route
   params). Ended up deliberately pinning Prisma to v6: the docs showed v7's SQLite path needs a
   driver adapter / `node:sqlite`, which adds complexity with no benefit for this project.
3. Built the Prisma schema and seeded 20 realistic universities across 12 countries with
   admission requirements (exams, min scores, GPA).
4. Built the query layer (`src/lib/universities.ts`) shared by both the public API routes and
   the AI tools — one source of truth, no separate/fake data for the chatbot.
5. Built the public pages (list + filters + detail) as Server Components — verified they work
   without ever opening the AI chat widget.
6. Built the AI layer: system prompt, 4 tools, DB-backed session memory with compaction, and a
   hand-rolled tool-calling loop with retry, in TypeScript.
7. Wrote unit tests (Vitest) and e2e tests (Playwright), then used **Playwright MCP** to manually
   verify filtering and the chat panel against the running dev server.
8. Found and fixed a client-side interactivity bug during that manual pass, then re-ran the full
   test suite.

## Definition of Done

- [x] GitHub repository (`github.com/zhadyrazhan/uni-aggregator`; local `main` tracks
      `origin/initial-setup-branch`)
- [x] README (rewritten, with a requirement-to-file map)
- [x] WORKFLOW.md (this file)
- [x] `ai-rules/*.md` from the participant (4 files, one per role, all under `zhadyra`)
- [x] MCP / sub-agents used (Context7 MCP for Next.js/Prisma/OpenAI SDK docs during the build;
      Playwright MCP for live smoke-testing and debugging; code-review skill as an audit pass on
      `src/lib/ai/*`)
- [x] AI-generated code (every file under `src/`, `prisma/`, and `tests/` was written by Claude
      Code in this session). Note: the two existing commits predate this convention and are
      already pushed, so they carry no `Co-Authored-By: Claude` trailer — subsequent commits do.
- [x] Autotests (18 Vitest unit tests + 6 Playwright e2e tests, all passing)

## Reflection

**1. Where did AI save the most time?**
Scaffolding the whole Next.js/Prisma/Tailwind stack, seeding 20 realistic universities with
country-appropriate admission requirements (ЕНТ for Kazakhstan, A-Levels/UCAT for the UK, Abitur
for Germany, etc.), and writing the hand-rolled tool-calling loop with retry and compaction-backed
memory in TypeScript would each have taken hours done by hand; together they took a single working
session. Reading current Next.js 16 / Prisma 6-7 docs via Context7 MCP also avoided a slow
trial-and-error cycle against APIs that match neither older tutorials nor training data.

**2. Where did AI get things wrong?**
Four concrete issues surfaced during the build. Only one came from running the app; the rest came
from checking docs or re-reading the code. That's the point — none of them would have failed a
test.

- `create-next-app` pulled Prisma 7, whose SQLite support needs a driver adapter
  (`node:sqlite` / `@prisma/adapter-*`) — the first schema draft assumed the classic
  `env("DATABASE_URL")` setup would just work. Caught by checking Context7 docs **before**
  running a migration, not after.
- The Prisma `mode: "insensitive"` filter (Postgres/MongoDB-only) was initially used for
  country/major filtering; SQLite doesn't support it. Caught by reasoning through the schema
  again rather than by a failed test — worth calling out separately, since otherwise silently
  broken filters would have shipped.
- Playwright driving the dev server against `http://127.0.0.1:3100` produced a page that looked
  fine on `curl` and in a screenshot but had zero client-side interactivity: Next.js 16 dev
  mode's cross-origin protection silently 403'd the `_next/static` JS chunks and the HMR
  websocket for that origin. Found via `browser_console_messages` in Playwright MCP, not by
  staring at the code — the fix itself (`localhost` instead of `127.0.0.1`) isn't visible from
  the sources at all.
- The first compaction implementation cut conversation memory by a fixed message count, which
  could slice an assistant `tool_calls` message away from its `tool` result rows if compaction
  fired mid-conversation — that combination is invalid for the OpenAI API. Caught on a second
  read of `memory.ts`, not by a failing test (there wasn't one exercising a long-enough
  conversation). Fixed by compacting on whole tool-call-group boundaries instead of a raw
  message counter.

**3. What would've taken 3x longer without AI?**
Hand-writing admission data for 20 universities — realistic and correct for each country; wiring
Prisma relations correctly on the first pass (many-to-many for majors, one-to-one for
requirements, session/message memory tables); and reading the actual current Next.js 16 /
Prisma 6-7 docs instead of guessing from older, more familiar versions. All three are the kind of
work that's mechanical once you know the shape of the result, but slow to do from scratch.

## Open threads

Not finished, and not recoverable from reading the code later:

- **Deploy is blocked on SQLite writes.** `AgentMemory` (`src/lib/ai/memory.ts`) creates a
  `ChatSession` row and a `ChatMessage` row on every chat turn, so the app is *not* read-only at
  request time. The `dev.db` bundled via `outputFileTracingIncludes` lands on a read-only
  serverless filesystem, so the first chat message would fail with `SQLITE_READONLY` while the
  catalog pages kept working. Two ways out: copy the DB to `/tmp` on cold start, or point
  `DATABASE_URL` at Turso/Neon. Neither touches query code — everything goes through
  `src/lib/db.ts` and `src/lib/universities.ts`.
- **No test exercises compaction.** `MAX_BUFFER_MESSAGES` is 16 and the longest e2e conversation
  is a single turn, so `compactIfNeeded()` never runs under test — including the tool-call-group
  boundary logic that was the subject of bug 4 above.
- **`deepmerge-ts` advisory** in Prisma's CLI config parser — dev-only, not worth the downgrade
  to a pre-release build. See the README section "Known npm audit note".

## Decisions worth remembering

Choices that weren't bugs, so they're recorded nowhere else:

- **One shared query layer** (`src/lib/universities.ts`) for both the REST routes and the AI
  tools, rather than letting the agent query Prisma directly. The spec requires tools backed by
  real data; sharing the layer makes that structurally true instead of a claim — and it's exactly
  why swapping the database later is a config change, not a code change.
- **SQLite over Postgres.** The catalog is fixed content baked into the deploy: `npm run build`
  runs `prisma migrate deploy && tsx prisma/seed.ts` every time. Cloning and running the project
  requires no external account, which matters more for a course project than write scalability.
- **httpOnly cookie for the session id, memory in the DB** rather than conversation state in
  `localStorage`. The transcript stays server-side (the client can't forge history into the
  prompt) and survives serverless cold starts between requests.
- **Prisma pinned to 6.** v7's SQLite path requires a driver adapter (`node:sqlite` /
  `@prisma/adapter-*`); that's added surface area with no benefit at this size.
