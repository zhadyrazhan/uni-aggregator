import { APIConnectionError, APIError, RateLimitError } from "openai";

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 500;

/** Retries a transient OpenAI API call (rate limit / connection error) with linear backoff. */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
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
