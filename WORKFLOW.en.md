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
9. Before deploying to Netlify, fixed the serverless chat-write blocker (see "Open threads"
   below) and merged the working branch into `main`.
10. After the first real deploy went live at `https://uniguide-aggregator.netlify.app`, did a
    live check of the deployed site (not just local tests) and found chat still failing with
    `SQLITE_READONLY` — the step-9 fix checked `NETLIFY`/`VERCEL` in `process.env`, and that
    variable turned out not to be available in Netlify's function runtime (build-time only).
    Fixed, as an intermediate step, by switching to `NODE_ENV === "production"`, which got the
    live chat working. Also ran the `code-review` skill for real against `src/lib/ai/*` and
    `src/lib/db.ts` (previously claimed in `ai_zhadyra.md` but never actually invoked) — it found
    7 issues, including that `NODE_ENV === "production"` was itself still a guess (would break a
    self-hosted deploy with a real persistent DB). The final `src/lib/db.ts` doesn't guess at
    all: it probes the actual file's writability (`fs.accessSync`). The other 6 findings were
    also fixed (see Reflection #2). Also brought `ai-rules/*.md` in line with the spec's exact
    template headings (`# Role`/`# System Rules`/`# MCP & Tools`/`# Subagents`/`# Output
    Contracts`).

## Definition of Done

- [x] GitHub repository (`github.com/zhadyrazhan/uni-aggregator`, `main` branch)
- [x] Deploy link (Netlify): **https://uniguide-aggregator.netlify.app** — verified live
      (catalog, filters, detail page, chat) after fixing the bug from step 10 above
- [x] README (rewritten, with a requirement-to-file map and the deploy link)
- [x] WORKFLOW.md (this file)
- [x] `ai-rules/*.md` from the participant (4 files, one per role, all under `zhadyra`)
- [x] MCP / sub-agents used (Context7 MCP for Next.js/Prisma/OpenAI SDK docs during the build;
      Playwright MCP for live smoke-testing and debugging; code-review skill as an audit pass on
      `src/lib/ai/*`)
- [x] AI-generated code (every file under `src/`, `prisma/`, and `tests/` was written by Claude
      Code in this session). Note: the two earliest commits predate the `Co-Authored-By: Claude`
      convention and carry no trailer; PR #1 into `main` was squash-merged — the squash commit's
      body preserves all 4 original commit messages and trailers.
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
Nine concrete issues surfaced during the build (counting the serverless-detection saga as one,
even though it took three attempts). The most serious one only showed up on the
live deploy — the rest came from checking docs, re-reading code, running the app locally, or a
dedicated `code-review` skill pass. Tellingly, all local tests (18 unit + 6 e2e) stayed green the
whole time chat was actually broken on the real Netlify deployment — local tests and a live
post-deploy check catch different classes of bugs.

- **The big one: two guesses in a row about the host's runtime environment.** The serverless
  chat-write fix (`src/lib/db.ts`) needed to detect when to copy the DB into `/tmp` — and the
  first two attempts both guessed at indirect signals instead of testing the real condition.
  V1 checked `process.env.NETLIFY`/`VERCEL`: looked right and even "passed" a local simulation
  (`NETLIFY=true npx tsx ...`), but Netlify's own docs only guarantee that variable during the
  **build** step, not inside the function's runtime — confirmed the hard way when the first chat
  message on `https://uniguide-aggregator.netlify.app` failed with `SQLITE_READONLY`. Caught only
  by a direct `curl` to the live `/api/chat` after deploying; no local test or `npm run build` run
  ever touched that code path. V2 switched to `NODE_ENV === "production"` — a documented Next.js
  guarantee, not a platform guess — and the live chat started working. But the `code-review` skill,
  run right after, correctly pointed out this was still a guess, just a better one: on a
  self-hosted deploy with a real persistent DB in production, this check would silently swap
  working data for ephemeral `/tmp`. V3 doesn't guess at all: it synchronously probes the actual
  writability of the file `DATABASE_URL` points at (`fs.accessSync(path, W_OK)`). Testing V3
  locally by `chmod 444`-ing the DB file (to reproduce a bundled read-only file exactly, instead
  of trusting the earlier env-var simulation again) surfaced a fourth bug in the same function:
  `fs.copyFileSync` preserves the source's permission bits on macOS (a clone-on-write syscall),
  so copying a read-only file into `/tmp` produced an equally read-only copy — silently
  defeating the whole mechanism. Fixed with an explicit `fs.chmodSync(writablePath, 0o600)` after
  the copy, rather than trusting copy behavior that isn't guaranteed consistent across platforms.
  Lesson: a guess that "works" on one platform is still a guess, and even a real
  condition-check needs its own fix path re-verified against the actual failure mode, not just
  against whichever simulation caught the previous bug.
- **The model's own reasoning text was silently discarded.** `SYSTEM_PROMPT` explicitly tells the
  model to "briefly state what you're about to do and why" before calling a tool, but
  `AgentMemory.addAssistantToolCalls` hardcoded `content: ""` when persisting a tool-calling turn
  — the model's actual reasoning text was thrown away, never reaching either the replayed history
  for later turns or any UI. No test caught this (no e2e scenario asserted on reasoning content)
  — only the `code-review` skill found it. Fixed: `addAssistantToolCalls` now accepts and stores
  the real `message.content`.
- Found by `code-review`, not tests: the agent loop (`agent.ts`) re-fetched the entire
  conversation history from the DB on every tool-loop iteration — up to 6 redundant read round
  trips per single chat turn. Fixed by accumulating messages in memory within the loop instead of
  re-querying.
- Found by `code-review`: the compaction OpenAI call (`compactIfNeeded`) had no retry wrapper,
  unlike the main agent loop — a transient API error there failed the entire chat turn over a
  background housekeeping step. Fixed with a shared `withRetry` helper (extracted into a new
  `src/lib/ai/retry.ts`, reused by both the main loop and compaction).
- Found by `code-review`: `tuitionUsd ? ... : "n/a"` in three places in `tools.ts` treated a
  tuition of exactly $0 (a free-tuition university) as missing, due to the truthiness check,
  while `rankingScore` right next to it correctly used `??`. Didn't manifest with the current
  seed data (no university has `tuitionUsd: 0`), but would have been a real bug for future data.
  Fixed with an explicit type check.
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

- **Serverless chat writes — fixed and verified live.** `AgentMemory` (`src/lib/ai/memory.ts`)
  creates a `ChatSession` row and a `ChatMessage` row on every chat turn, so the app is *not*
  read-only at request time, and the `dev.db` bundled via `outputFileTracingIncludes` lands on a
  read-only serverless filesystem. `src/lib/db.ts` probes the real writability of the
  `DATABASE_URL` file (`fs.accessSync`, no guessing about the host — see Reflection #2 for the
  two guesses that came before this) and, only if it's read-only, copies the seeded DB into
  `/tmp/dev.db` once per cold start, opening the Prisma client against that copy via the
  `datasourceUrl` option — no query code changes. Confirmed with a live `curl` against
  `https://uniguide-aggregator.netlify.app/api/chat` after the fix — `200 OK` with a real
  tool-calling reply. Remaining tradeoff: `/tmp` is ephemeral per function instance, so chat
  history doesn't survive a cold start or get shared across parallel instances — acceptable for a
  class project; for durable history, switch to Turso/Neon and rerun `npx prisma migrate deploy`.
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
