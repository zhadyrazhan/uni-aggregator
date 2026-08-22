# WORKFLOW.md — UniGuide (Агрегатор университетов)

Module 2 "AI-Native App Sprint" group project. Built solo, covering all four spec roles
(Frontend, Backend, AI Engineer, QA/Workflow Master) — see `ai-rules/*_zhadyra.md` for the
per-role rules that governed each part of the build.

## How this was built

Working session with Claude Code (Sonnet 5) in VSCode's integrated terminal, against an OpenAI
API key for the runtime chatbot. No teammates; every role's `ai-rules` file is under
`zhadyra` — see the "Team Reflection" section below for how the individual-contribution scoring
in the spec applies here.

**Sequence:**
1. Read the assignment PDF and the prior course project (`project1-kinomaniac`) to establish the
   grading pattern (hand-rolled agent loop, no `AgentExecutor`, custom memory with compaction).
2. Scaffolded Next.js 16 (App Router, TypeScript, Tailwind) via `create-next-app`, moved it into
   the existing git repo.
3. Checked Next.js 16 and Prisma docs via **Context7 MCP** before writing any route handlers or
   the schema — both were newer major versions than the assistant's training data, with real
   breaking changes (Prisma 7's SQLite driver-adapter requirement; Next.js 15+ async route
   params). Ended up deliberately pinning Prisma to v6 after the docs showed v7's SQLite path
   needed a driver adapter / `node:sqlite` that added complexity with no benefit for this project.
4. Built the Prisma schema + seeded 20 real-style universities across 10 countries with
   admission requirements (exams, min scores, GPA).
5. Built the query layer (`src/lib/universities.ts`) shared by both the public API routes and
   the AI tools — one source of truth, no separate/fake data for the chatbot.
6. Built the public pages (list + filters + detail) as Server Components — verified working
   with the AI chat widget never opened.
7. Built the AI layer: system prompt, 4 tools, DB-backed session memory with compaction, and a
   hand-rolled tool-calling loop with retry — same pattern as `project1-kinomaniac/agent.py`,
   ported to TypeScript.
8. Wrote unit tests (Vitest) and e2e tests (Playwright), then used **Playwright MCP** directly
   against the running dev server to interactively verify filtering and the chat panel.
9. Found and fixed two real bugs during that manual pass (see below), then re-ran the full test
   suite.

## Definition of Done

- [x] GitHub repository (existing repo, `origin/main`)
- [ ] Deploy link (Vercel/Netlify/Railway) — not deployed yet; no account was available while
      building. Project is deploy-ready (see README "Deploying"); deploying is a follow-up step.
- [x] README (rewritten, requirement-to-file mapping)
- [x] WORKFLOW.md (this file)
- [x] `ai-rules/*.md` from the participant (4 files, one per role, all under `zhadyra`)
- [x] MCP / sub-agents used (Context7 MCP for Next.js/Prisma/openai-SDK docs during the build;
      Playwright MCP for live smoke-testing and debugging; code-review skill as an audit pass on
      `src/lib/ai/*`)
- [x] AI-generated commits (this entire codebase was written by Claude Code in this session)
- [x] Autotests (18 Vitest unit tests + 6 Playwright e2e tests, all passing)

## Team Reflection

**1. Where did AI save the most time?**
Scaffolding the whole Next.js/Prisma/Tailwind stack, seeding 20 realistic universities with
country-appropriate admission requirements (ЕНТ for Kazakhstan, A-Levels/UCAT for the UK, Abitur
for Germany, etc.), and porting the kinomaniac agent-loop pattern to TypeScript would each have
taken hours done by hand; together they took a single working session. Reading current Next.js
16 / Prisma 7 docs via Context7 MCP also avoided a slow trial-and-error cycle against APIs that
don't match older tutorials or training data.

**2. Where did AI get things wrong?**
Two concrete bugs surfaced during the build, both caught by actually running the app rather than
trusting the code on read:
- `create-next-app` pulled Prisma 7, whose SQLite support needs a driver adapter
  (`node:sqlite`/`@prisma/adapter-*`) — the first schema draft assumed the classic
  `env("DATABASE_URL")` setup would just work. Caught by checking Context7 docs before running
  a migration, not after.
- The Prisma `mode: "insensitive"` filter (Postgres/MongoDB-only) was initially used for
  country/major filtering; SQLite doesn't support it. Caught by reasoning through the schema
  again rather than by a failed test — worth calling out since it would have shipped silently
  broken filters if not double-checked.
- Playwright driving the dev server against `http://127.0.0.1:3100` produced a page that looked
  fine on `curl` and in a screenshot but had zero client-side interactivity: Next.js 16 dev
  mode's cross-origin protection silently 403'd the `_next/static` JS chunks and the HMR
  websocket for that origin. Found by checking `browser_console_messages` in Playwright MCP,
  not by staring at the code — the fix (`localhost` instead of `127.0.0.1`) isn't something
  visible from source at all.
- The first compaction implementation cut conversation memory by a fixed message count, which
  could slice an assistant `tool_calls` message away from its `tool` result rows once a long
  chat triggered compaction mid-conversation — that combination is invalid for the OpenAI API.
  Caught on a second read of `memory.ts`, not by a failing test (there wasn't one exercising a
  long-enough conversation) — fixed by compacting on whole tool-call-group boundaries instead of
  raw message counts.

**3. What would've taken 3x longer without AI?**
Hand-writing 20 universities' worth of realistic, country-appropriate admission data; wiring
Prisma relations (many-to-many majors, one-to-one requirements, session/message memory tables)
correctly on the first pass; and reading Next.js 16 / Prisma 7's actual current docs instead of
guessing from older, more familiar versions — all three are the kind of work that's mechanical
once you know the shape but slow to get right from scratch.
