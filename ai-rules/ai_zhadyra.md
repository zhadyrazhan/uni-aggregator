# Role

AI Engineer (Lead Architect for the assistant) for UniGuide. Owns `src/lib/ai/**`
(`agent.ts`, `tools.ts`, `memory.ts`, `prompt.ts`) and `src/app/api/chat/route.ts`.

# System Rules

- The agent must never answer factual questions about a university (name, tuition, exams,
  ranking) from the model's own knowledge — every fact has to come from a tool call against
  the real Prisma-backed catalog in `src/lib/universities.ts`. A bare chat completion with no
  tool use is an explicit failing case for this project (per the assignment spec) and must
  never ship.
- Comparisons ("compare X and Y") must be done via multiple `get_university_details` calls
  (one per university), not a single guessed answer — this is the project's required
  multi-tool-calling proof, mirrored from `project1-kinomaniac/agent.py`'s comparison pattern.
- No LangChain `AgentExecutor` / `create_tool_calling_agent` — the loop in `agent.ts` is
  hand-rolled on purpose (same constraint the team applied in the prior course project), so the
  reasoning/tool-call/retry logic is auditable line by line.
- Memory is server-side (`ChatSession`/`ChatMessage` in Prisma), not just kept in the browser —
  it must survive a page reload and a serverless cold start. Compaction
  (`AgentMemory.compactIfNeeded`) must never drop the user's stated preferences (major, country,
  budget) — it summarizes instead of truncating blindly.
- Never log or persist the raw `OPENAI_API_KEY`.

# MCP & Tools available to the AI (runtime, i.e. what the deployed chatbot itself can call)

1. `list_universities(country?, major?, limit?)`
2. `get_university_details(name)`
3. `get_admission_requirements(name)`
4. `recommend_universities(major?, country?, maxTuitionUsd?)`

All four are plain function-calling tools declared in `tools.ts` (`TOOLS_SCHEMA`) and executed
against the shared query layer — no external MCP server is exposed to the runtime chatbot itself
(that would need a hosted MCP endpoint, out of scope for a single-deploy Next.js app).

# MCP used while building this role (development-time)

- **code-review skill** — run against `src/lib/ai/*` before considering the agent loop done,
  acting as an audit sub-agent for the tool-calling/memory/retry logic.
- **Context7 MCP** — checked current `openai` Node SDK error-class names
  (`APIConnectionError`, `RateLimitError`, `APIError`) used in `agent.ts`'s retry logic.

# Output Contracts

- `POST /api/chat` request: `{ message: string }`. Response: `{ reply: string }` or
  `{ error: string }` with a non-2xx status — the frontend (`ChatPanel.tsx`) renders either as a
  chat bubble, never throws.
- Tool results returned to the model are plain human-readable strings (not JSON) — the model
  reads them directly into its final answer, matching the pattern used by
  `project1-kinomaniac/tools.py`.
