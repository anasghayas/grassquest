// Generates tailored daily quests using Gemma via Ollama, falling back if AI is offline.

import { z } from "zod";
import { chatJson } from "./ollama.js";
import { getFallbackQuest } from "./fallbackQuests.js";
import type { WeatherData } from "./weather.js";

// Zod schema for validated quest content
export const questContentSchema = z.object({
  title: z.string().max(60),
  description: z.string().max(200),
  objective: z.string().max(100),
  tip: z.string().max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export type QuestContent = z.infer<typeof questContentSchema>;

// Return payload combining the quest content and its origin source
export interface GeneratedQuestResult {
  quest: QuestContent;
  source: "gemma" | "fallback";
}

// Builds the detailed prompt for the Gemma model including weather and safety rules
function buildQuestPrompt(
  mood: "chill" | "energetic" | "curious",
  weather: WeatherData
): string {
  const weatherDesc = `${weather.tempC}°C, ${weather.isRaining ? "raining" : "no rain"}, ${weather.isDay ? "daytime" : "nighttime"}`;

  return `Create a daily outdoor mini-quest for a player.
Player Mood: ${mood}
Current Weather: ${weatherDesc}

SAFETY & DESIGN RULES:
1. Must be completely safe, legal, and free in public parks, sidewalks, or backyards.
2. NO trespassing, NO climbing, NO touching wildlife, stay away from roads and water edges, NO strangers.
3. If raining or not daytime: focus on window, porch, doorstep, or very short walks only.
4. Match difficulty and energy strictly to mood (${mood}).
5. Never repeat generic advice like "take a walk".
6. The objective must be a single, concrete visible thing that a smartphone photo can clearly show.

Return valid JSON with:
- title: Catchy quest name (max 60 chars)
- description: Inspiring quest instructions (max 200 chars)
- objective: Concrete visible item the photo must capture (max 100 chars)
- tip: Helpful tip for finding or spotting the objective (max 100 chars)
- difficulty: "easy", "medium", or "hard"`;
}

// Generates a quest using Ollama/Gemma with one retry; falls back safely to preset quests
export async function generateQuest(
  mood: "chill" | "energetic" | "curious",
  weather: WeatherData
): Promise<GeneratedQuestResult> {
  const prompt = buildQuestPrompt(mood, weather);

  // Attempt 1: Call Ollama with schema validation
  try {
    const result = await chatJson({
      messages: [
        {
          role: "system",
          content:
            "You are GrassQuest AI. You design safe, delightful outdoor quests that inspire people to explore. Output valid JSON matching the requested schema.",
        },
        { role: "user", content: prompt },
      ],
      schema: questContentSchema,
      options: {
        temperature: 0.8,
        num_ctx: 2048,
      },
      keepAlive: "30m",
      timeoutMs: 30000,
    });

    return { quest: result, source: "gemma" };
  } catch (err) {
    console.warn("First attempt generating quest with Gemma failed:", (err as Error).message);
  }

  // Attempt 2: Retry once on failure
  try {
    const result = await chatJson({
      messages: [
        {
          role: "system",
          content:
            "You are GrassQuest AI. You design safe, delightful outdoor quests that inspire people to explore. Output valid JSON matching the requested schema.",
        },
        { role: "user", content: prompt },
      ],
      schema: questContentSchema,
      options: {
        temperature: 0.8,
        num_ctx: 2048,
      },
      keepAlive: "30m",
      timeoutMs: 30000,
    });

    return { quest: result, source: "gemma" };
  } catch (err) {
    console.warn("Retry generating quest with Gemma failed, using fallback:", (err as Error).message);
  }

  // Fallback: If AI is offline or both attempts fail, return a curated fallback quest
  const fallback = getFallbackQuest(mood, weather);
  return { quest: fallback, source: "fallback" };
}
