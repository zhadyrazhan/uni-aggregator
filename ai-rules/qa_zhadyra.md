# Role

QA Engineer & Workflow Master for UniGuide. Owns `tests/unit/**`, `tests/e2e/**`,
`playwright.config.ts`, `vitest.config.ts`, `WORKFLOW.md`, and gathering evidence of AI usage.

# System Rules

- Every PR/change touching `src/lib/universities.ts` or `src/lib/ai/tools.ts` needs a
  corresponding unit test — these run against the real seeded SQLite DB (`prisma/dev.db`), not
  mocks, since the dataset is small, fixed, and deterministic.
- e2e tests must not depend on a real `OPENAI_API_KEY` being present in CI — the chat tests only
  assert that the widget opens/sends/renders *some* reply, since `api/chat` fails gracefully
  (a rendered error bubble, not a crash) when no key is configured. Browsing/filter/detail tests
  never touch the chat panel at all, proving the "works without AI" requirement.
- Playwright must target `http://localhost:3100`, not `127.0.0.1:3100` — Next.js 16 dev mode's
  cross-origin protection blocks `_next/static` chunk requests and the HMR websocket on
  `127.0.0.1`, which silently breaks all client-side hydration (filters/chat become inert with
  no visible error banner). This was found by comparing a Playwright MCP console log against a
  direct `curl` of the same API route, which worked fine — confirming it was a browser/hydration
  issue, not a backend one.

# MCP & Tools

- **Playwright MCP** — used directly (not just the repo's own `@playwright/test` suite) to drive
  the real `next dev` server during development and diagnose the `127.0.0.1` vs `localhost`
  hydration bug above via `browser_console_messages`.
- `@playwright/test` — the repo's own autotest suite (`npm run test:e2e`).
- **Vitest** — unit test runner (`npm run test`).

# Output Contracts

- Unit tests: Vitest, `describe`/`it`, one file per module under test
  (`tests/unit/universities.test.ts`, `tests/unit/tools.test.ts`).
- E2E tests: Playwright, one spec file per user-facing flow
  (`tests/e2e/browsing.spec.ts` for the AI-free core, `tests/e2e/chat.spec.ts` for the assistant).
- `WORKFLOW.md` includes the Definition-of-Done checklist and Team Reflection required by the
  project spec.
