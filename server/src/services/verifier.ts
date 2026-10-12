// Photo verification service: verifies quest photos using Gemma or honor fallback.

import { z } from "zod";
import { chatJson, isAiReady } from "./ollama.js";

// Zod schema for structured verification output from Gemma
export const verificationSchema = z.object({
  matches: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(140),
});

export type VerificationData = z.infer<typeof verificationSchema>;

export interface VerifyInput {
  photoBase64: string;
  objective: string;
}

export interface VerifyOutput {
  success: boolean;
  reason: string;
  verifiedBy: "gemma" | "honor";
}

// Verifies a quest photo against the objective with Gemma, or accepts on honor if AI is offline
export async function verifyPhoto(input: VerifyInput): Promise<VerifyOutput> {
  // Check if Ollama AI is reachable and has the model pulled
  const aiReady = await isAiReady();
  if (!aiReady) {
    return {
      success: true,
      reason: "AI offline: verified on the honor system! Great job exploring today.",
      verifiedBy: "honor",
    };
  }

  const prompt = `Quest objective to verify: "${input.objective}".
Does this photo reasonably show or contain the objective?
Be lenient: accept if the photo reasonably shows the objective.
Output pure JSON:
{
  "matches": boolean,
  "confidence": number between 0 and 1,
  "reason": short kind and encouraging string (max 140 chars)
}`;

  try {
    const result = await chatJson({
      messages: [
        {
          role: "system",
          content:
            "You are GrassQuest Photo Verifier. You analyze photos submitted by users to check if they completed their outdoor quest. Be lenient and encouraging. Always output valid JSON matching the schema.",
        },
        {
          role: "user",
          content: prompt,
          images: [input.photoBase64],
        },
      ],
      schema: verificationSchema,
      timeoutMs: 120000,
    });

    const success = result.matches && result.confidence >= 0.5;

    return {
      success,
      reason: result.reason,
      verifiedBy: "gemma",
    };
  } catch (err) {
    console.warn("Photo verification with Gemma failed, falling back to honor:", (err as Error).message);
    return {
      success: true,
      reason: "Verified on the honor system! Keep up the great exploration.",
      verifiedBy: "honor",
    };
  }
}
