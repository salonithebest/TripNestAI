import { env } from "../config/env";

const RETRYABLE_NETWORK_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"]);
const MAX_ATTEMPTS = 3;

export function getGeminiStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as {
    status?: unknown;
    response?: { status?: unknown };
  };
  const status = candidate.status ?? candidate.response?.status;
  return typeof status === "number" ? status : undefined;
}

async function createGeminiClient() {
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

function isRetryable(error: unknown): boolean {
  const status = getGeminiStatus(error);
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return typeof error.code === "string" && RETRYABLE_NETWORK_CODES.has(error.code);
}

function errorName(error: unknown): string {
  if (typeof error !== "object" || error === null || !("name" in error)) return "Error";
  return typeof error.name === "string" ? error.name : "Error";
}

export async function generateWithGemini<T>(
  operation: string,
  generate: (client: Awaited<ReturnType<typeof createGeminiClient>>) => Promise<T>,
): Promise<T> {
  const client = await createGeminiClient();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await generate(client);
    } catch (error) {
      const retry = attempt < MAX_ATTEMPTS && isRetryable(error);
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        provider: "gemini",
        operation,
        status: getGeminiStatus(error) ?? null,
        errorName: errorName(error),
        attempt,
        retry,
      }));
      if (!retry) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * 2 ** (attempt - 1)));
    }
  }

  throw new Error("Gemini request ended without a response.");
}
