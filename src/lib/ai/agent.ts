import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { AgentMemory } from "@/lib/ai/memory";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { withRetry } from "@/lib/ai/retry";
import { executeTool, TOOLS_SCHEMA } from "@/lib/ai/tools";

/**
 * Hand-rolled tool-calling agent loop — no LangChain AgentExecutor. Call the model with tools ->
 * if it requests tool calls, execute them and feed the results back -> repeat until it returns a
 * final text answer or the iteration cap is hit. Retries transient API errors with exponential
 * backoff.
 */
const MAX_TOOL_ITERATIONS = 6;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export type AgentStep =
  | { type: "reasoning"; text: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "final"; text: string };

export async function runAgent(
  sessionId: string | undefined,
  userMessage: string,
  onStep?: (step: AgentStep) => void
): Promise<{ sessionId: string; reply: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env (see .env.example).");
  }

  const client = new OpenAI({ apiKey });
  const memory = await AgentMemory.forSession(sessionId, client, MODEL);

  await memory.addUserMessage(userMessage);
  await memory.compactIfNeeded();

  // Fetched once and appended to locally as the loop progresses, instead of re-querying the DB
  // on every tool-loop iteration (up to MAX_TOOL_ITERATIONS times per single chat turn).
  // Everything pushed here is also persisted via `memory.add*` so it survives across requests.
  const messages = await memory.getMessagesForApi(SYSTEM_PROMPT);

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await callWithRetry(client, messages);
    const message = response.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      await memory.addAssistantToolCalls(message.content, message.tool_calls);
      messages.push({
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      });

      if (message.content) {
        onStep?.({ type: "reasoning", text: message.content });
      }

      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        const name = call.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // leave args empty if the model produced malformed JSON
        }

        onStep?.({ type: "tool_call", name, args });

        const result = await executeTool(name, args);
        await memory.addToolResult(call.id, name, result);
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
      continue;
    }

    const finalText = message.content || "I couldn't come up with an answer — could you rephrase?";
    await memory.addAssistantMessage(finalText);
    onStep?.({ type: "final", text: finalText });
    return { sessionId: memory.id, reply: finalText };
  }

  const fallback = "I've reached my step limit without a final answer — could you narrow down the question?";
  await memory.addAssistantMessage(fallback);
  return { sessionId: memory.id, reply: fallback };
}

function callWithRetry(client: OpenAI, messages: ChatCompletionMessageParam[]) {
  return withRetry(() =>
    client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS_SCHEMA,
      tool_choice: "auto",
      temperature: 0,
    })
  );
}
