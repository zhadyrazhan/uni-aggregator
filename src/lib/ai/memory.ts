import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { db } from "@/lib/db";
import { withRetry } from "@/lib/ai/retry";

/**
 * Server-side conversation memory, persisted in ChatSession/ChatMessage (prisma/schema.prisma)
 * and keyed by a session id stored in a cookie on the client. Once the buffer grows past
 * MAX_BUFFER_MESSAGES, the oldest messages are compacted into a running summary via one extra
 * LLM call — the same compaction technique used in lecture2/compaction_example.py, ported to a
 * DB-backed buffer so it survives serverless cold starts between requests.
 */
const MAX_BUFFER_MESSAGES = 16;
const KEEP_RECENT_UNITS = 4;

export class AgentMemory {
  private constructor(
    private readonly sessionId: string,
    private readonly client: OpenAI,
    private readonly model: string
  ) {}

  static async forSession(sessionId: string | undefined, client: OpenAI, model: string) {
    if (sessionId) {
      const existing = await db.chatSession.findUnique({ where: { id: sessionId } });
      if (existing) return new AgentMemory(existing.id, client, model);
    }
    const created = await db.chatSession.create({ data: {} });
    return new AgentMemory(created.id, client, model);
  }

  get id() {
    return this.sessionId;
  }

  async addUserMessage(content: string) {
    await db.chatMessage.create({ data: { sessionId: this.sessionId, role: "user", content } });
  }

  async addAssistantToolCalls(
    content: string | null | undefined,
    toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
  ) {
    // Persist the model's own reasoning text (SYSTEM_PROMPT rule 4 asks it to explain itself
    // before calling a tool) instead of discarding it — otherwise it's lost from both the
    // replayed history the model sees on later turns and any UI that surfaces it.
    await db.chatMessage.create({
      data: {
        sessionId: this.sessionId,
        role: "assistant",
        content: content ?? "",
        toolCallsJson: JSON.stringify(toolCalls),
      },
    });
  }

  async addToolResult(toolCallId: string, toolName: string, content: string) {
    await db.chatMessage.create({
      data: { sessionId: this.sessionId, role: "tool", content, toolCallId, toolName },
    });
  }

  async addAssistantMessage(content: string) {
    await db.chatMessage.create({ data: { sessionId: this.sessionId, role: "assistant", content } });
  }

  async getMessagesForApi(systemPrompt: string): Promise<ChatCompletionMessageParam[]> {
    const [session, rows] = await Promise.all([
      db.chatSession.findUniqueOrThrow({ where: { id: this.sessionId } }),
      db.chatMessage.findMany({
        where: { sessionId: this.sessionId },
        // `id` (cuid, itself time-ordered) breaks ties among rows whose `createdAt` lands in the
        // same tick — SQLite's default timestamp resolution isn't fine-grained enough to keep
        // same-second inserts distinguishable by createdAt alone.
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ]);

    const systemContent = session.summary
      ? `${systemPrompt}\n\nSummary of earlier conversation (already-established facts/preferences): ${session.summary}`
      : systemPrompt;

    const messages: ChatCompletionMessageParam[] = [{ role: "system", content: systemContent }];

    for (const row of rows) {
      if (row.role === "user") {
        messages.push({ role: "user", content: row.content });
      } else if (row.role === "assistant" && row.toolCallsJson) {
        messages.push({
          role: "assistant",
          content: row.content || null,
          tool_calls: JSON.parse(row.toolCallsJson),
        });
      } else if (row.role === "assistant") {
        messages.push({ role: "assistant", content: row.content });
      } else if (row.role === "tool" && row.toolCallId) {
        messages.push({ role: "tool", tool_call_id: row.toolCallId, content: row.content });
      }
    }

    return messages;
  }

  /** Summarizes and drops the oldest messages once the buffer grows past MAX_BUFFER_MESSAGES. */
  async compactIfNeeded() {
    const rows = await db.chatMessage.findMany({
      where: { sessionId: this.sessionId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (rows.length <= MAX_BUFFER_MESSAGES) return;

    // Group rows into units first: an assistant tool_calls message plus the "tool" result
    // rows that immediately follow it must stay together, or the reconstructed history in
    // getMessagesForApi() would hand the OpenAI API a "tool" message with no matching
    // tool_calls parent (a 400 error) once the parent gets compacted away. Compact whole
    // units only, never mid-group.
    const units: (typeof rows)[] = [];
    for (const row of rows) {
      if (row.role === "tool" && units.length > 0) {
        units[units.length - 1].push(row);
      } else {
        units.push([row]);
      }
    }
    if (units.length <= 1) return;

    const keepUnits = Math.min(KEEP_RECENT_UNITS, units.length - 1);
    const toCompact = units.slice(0, units.length - keepUnits).flat();
    const transcript = toCompact
      .map((r) => `${r.role}: ${r.content || (r.toolCallsJson ? "[tool call]" : "")}`)
      .join("\n");

    const session = await db.chatSession.findUniqueOrThrow({ where: { id: this.sessionId } });

    // Retried the same way as the main agent loop's completions call (src/lib/ai/agent.ts) —
    // this housekeeping step runs on the hot request path too, and an unretried transient error
    // here would fail the user's entire chat turn just to compact old messages.
    const response = await withRetry(() =>
      this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Summarize the following conversation in 2-4 sentences, preserving the user's stated preferences (major, country, budget) and any names already discussed. Be terse.",
          },
          {
            role: "user",
            content: session.summary
              ? `Previous summary: ${session.summary}\n\nNew messages to fold in:\n${transcript}`
              : transcript,
          },
        ],
      })
    );

    const summary = response.choices[0]?.message.content?.trim() || session.summary || "";

    await db.$transaction([
      db.chatSession.update({ where: { id: this.sessionId }, data: { summary } }),
      db.chatMessage.deleteMany({ where: { id: { in: toCompact.map((r) => r.id) } } }),
    ]);
  }
}
