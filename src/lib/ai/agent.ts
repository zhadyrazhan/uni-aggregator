import OpenAI, { APIConnectionError, APIError, RateLimitError } from "openai";
import { AgentMemory } from "@/lib/ai/memory";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { executeTool, TOOLS_SCHEMA } from "@/lib/ai/tools";

/**
 * Hand-rolled tool-calling agent loop — no LangChain AgentExecutor. Call the model with tools ->
 * if it requests tool calls, execute them and feed the results back -> repeat until it returns a
 * final text answer or the iteration cap is hit. Retries transient API errors with exponential
 * backoff.
 */
const MAX_TOOL_ITERATIONS = 6;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 500;
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

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const messages = await memory.getMessagesForApi(SYSTEM_PROMPT);
    const response = await callWithRetry(client, messages);
    const message = response.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      await memory.addAssistantToolCalls(message.tool_calls);

      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        const name = call.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // leave args empty if the model produced malformed JSON
        }

        onStep?.({ type: "reasoning", text: `Calling ${name}(${JSON.stringify(args)})` });
        onStep?.({ type: "tool_call", name, args });

        const result = await executeTool(name, args);
        await memory.addToolResult(call.id, name, result);
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

async function callWithRetry(client: OpenAI, messages: Parameters<typeof client.chat.completions.create>[0]["messages"]) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOLS_SCHEMA,
        tool_choice: "auto",
        temperature: 0,
      });
    } catch (error) {
      lastError = error;
      if (error instanceof RateLimitError || error instanceof APIConnectionError) {
        await sleep(RETRY_BACKOFF_MS * attempt);
        continue;
      }
      if (error instanceof APIError) break;
      throw error;
    }
  }
  throw new Error(`OpenAI request failed after ${MAX_RETRIES} attempts: ${String(lastError)}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
