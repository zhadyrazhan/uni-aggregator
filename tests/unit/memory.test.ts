import { afterEach, describe, expect, it } from "vitest";
import type OpenAI from "openai";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
import { db } from "@/lib/db";
import { AgentMemory } from "@/lib/ai/memory";

// Mirrors MAX_BUFFER_MESSAGES / KEEP_RECENT_UNITS in src/lib/ai/memory.ts — compaction kicks in
// once the buffer grows past 16 rows, keeping the 4 most recent "units" (a single message, or an
// assistant tool-call message plus the tool result rows that immediately follow it).
const KEEP_RECENT_UNITS = 4;

function fakeOpenAI(summary: string): OpenAI {
  return {
    chat: { completions: { create: async () => ({ choices: [{ message: { content: summary } }] }) } },
  } as unknown as OpenAI;
}

const sessionsToClean: string[] = [];

afterEach(async () => {
  while (sessionsToClean.length) {
    const id = sessionsToClean.pop()!;
    await db.chatSession.delete({ where: { id } }).catch(() => {});
  }
});

async function newMemory(summary = "Wants CS in Kazakhstan, budget under $5k.") {
  const memory = await AgentMemory.forSession(undefined, fakeOpenAI(summary), "gpt-4o-mini");
  sessionsToClean.push(memory.id);
  return memory;
}

describe("AgentMemory.compactIfNeeded", () => {
  it("leaves a short conversation untouched", async () => {
    const memory = await newMemory();
    for (let i = 0; i < 5; i++) {
      await memory.addUserMessage(`question ${i}`);
      await memory.addAssistantMessage(`answer ${i}`);
    }
    await memory.compactIfNeeded();

    const rows = await db.chatMessage.findMany({ where: { sessionId: memory.id } });
    expect(rows.length).toBe(10);
    const session = await db.chatSession.findUniqueOrThrow({ where: { id: memory.id } });
    expect(session.summary).toBeNull();
  });

  it("summarizes and drops the oldest messages once the buffer overflows, keeping the most recent units verbatim", async () => {
    const memory = await newMemory("User wants CS in Kazakhstan, budget under $5k.");
    for (let i = 0; i < 10; i++) {
      await memory.addUserMessage(`question ${i}`);
      await memory.addAssistantMessage(`answer ${i}`);
    }
    await memory.compactIfNeeded();

    const rows = await db.chatMessage.findMany({
      where: { sessionId: memory.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    expect(rows.length).toBe(KEEP_RECENT_UNITS);
    expect(rows.map((r) => r.content)).toEqual(["question 8", "answer 8", "question 9", "answer 9"]);

    const session = await db.chatSession.findUniqueOrThrow({ where: { id: memory.id } });
    expect(session.summary).toBe("User wants CS in Kazakhstan, budget under $5k.");
  });

  it("keeps an assistant tool-call message grouped with its tool result row when compacting", async () => {
    const memory = await newMemory();
    for (let i = 0; i < 8; i++) {
      await memory.addUserMessage(`padding question ${i}`);
      await memory.addAssistantMessage(`padding answer ${i}`);
    }
    await memory.addUserMessage("Which universities teach CS in Kazakhstan?");
    const toolCalls = [
      { id: "call_1", type: "function", function: { name: "list_universities", arguments: "{}" } },
    ] as ChatCompletionMessageToolCall[];
    await memory.addAssistantToolCalls("Checking the catalog.", toolCalls);
    await memory.addToolResult("call_1", "list_universities", "Nazarbayev University, ...");
    await memory.addAssistantMessage("Nazarbayev University offers Computer Science.");

    await memory.compactIfNeeded();

    const rows = await db.chatMessage.findMany({
      where: { sessionId: memory.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    expect(rows.map((r) => r.role)).toEqual(["assistant", "user", "assistant", "tool", "assistant"]);
    expect(rows[2].toolCallsJson).toBeTruthy();
    expect(rows[3].toolCallId).toBe("call_1");

    // getMessagesForApi() must never hand the OpenAI API a "tool" message with no preceding
    // assistant tool_calls entry — that's a 400 error (see the comment in memory.ts).
    const messages = await memory.getMessagesForApi("system prompt");
    const toolIndex = messages.findIndex((m) => m.role === "tool");
    expect(toolIndex).toBeGreaterThan(0);
    const parent = messages[toolIndex - 1];
    expect(parent.role).toBe("assistant");
    expect(parent.role === "assistant" && parent.tool_calls?.[0]?.id).toBe("call_1");
  });

  it("folds the compacted summary into the system prompt on the next call", async () => {
    const memory = await newMemory("Wants Computer Science in Kazakhstan.");
    for (let i = 0; i < 10; i++) {
      await memory.addUserMessage(`question ${i}`);
      await memory.addAssistantMessage(`answer ${i}`);
    }
    await memory.compactIfNeeded();

    const messages = await memory.getMessagesForApi("You are UniGuide.");
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("You are UniGuide.");
    expect(messages[0].content).toContain("Wants Computer Science in Kazakhstan.");
  });
});
