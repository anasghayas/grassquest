// Ollama AI client and helpers for structured chat completion and health checking.

import { Ollama, type Message, type Options } from "ollama";
import { z, type ZodType } from "zod";
import { config } from "../config.js";

// Client instance configured with the Ollama server URL from environment variables
export const ollama = new Ollama({ host: config.ollamaHost });

// Helper to strip markdown code fences from AI responses before JSON parsing
function cleanJsonString(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    const withoutStart = trimmed.replace(/^```(?:json)?\s*/i, "");
    return withoutStart.replace(/\s*```$/, "").trim();
  }
  return trimmed;
}

// Checks if the Ollama server is reachable and if the configured model is available
export async function isAiReady(): Promise<boolean> {
  try {
    // 5-second timeout so health checks fail quickly when Ollama is offline
    const listPromise = ollama.list();
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timeout checking Ollama")), 5000);
    });

    const response = await Promise.race([listPromise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    });

    const targetModel = config.ollamaModel.toLowerCase();
    // Check if any installed model matches the configured model name
    return response.models.some((m) => {
      const name = m.name?.toLowerCase() ?? "";
      const model = m.model?.toLowerCase() ?? "";
      return (
        name === targetModel ||
        name === `${targetModel}:latest` ||
        model === targetModel ||
        model === `${targetModel}:latest` ||
        name.startsWith(`${targetModel}:`)
      );
    });
  } catch {
    return false;
  }
}

// Options for calling chatJson
export interface ChatJsonOptions<T> {
  // Conversation messages to send to the model
  messages: Message[];
  // Zod schema to validate and type the output
  schema: ZodType<T>;
  // Optional custom JSON schema; defaults to converting the Zod schema
  formatSchema?: object | string;
  // Optional Ollama model generation options (temperature, num_ctx, etc.)
  options?: Partial<Options>;
  // How long to keep the model in memory (e.g. "30m")
  keepAlive?: string | number;
  // Maximum time in milliseconds to wait for a response
  timeoutMs?: number;
}

// Sends a chat request to Ollama and returns the parsed and Zod-validated JSON output
export async function chatJson<T>(params: ChatJsonOptions<T>): Promise<T> {
  const {
    messages,
    schema,
    formatSchema,
    options,
    keepAlive = "30m",
    timeoutMs = 60000,
  } = params;

  // Derive JSON schema from Zod schema if not explicitly provided
  const format = formatSchema ?? z.toJSONSchema(schema);

  const chatPromise = ollama.chat({
    model: config.ollamaModel,
    messages,
    format,
    stream: false,
    options,
    keep_alive: keepAlive,
  });

  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Ollama chat timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    const response = await Promise.race([chatPromise, timeoutPromise]);
    const rawContent = response.message.content;
    const cleaned = cleanJsonString(rawContent);
    const parsed = JSON.parse(cleaned);

    // Validate the parsed JSON structure against the Zod schema
    return schema.parse(parsed);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
