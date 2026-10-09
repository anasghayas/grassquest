// Loads and validates environment variables using Zod.
// Any missing or invalid env var will throw a clear error at startup.

import "dotenv/config";
import { z } from "zod";

// Schema for all environment variables the server needs
const envSchema = z.object({
  PORT: z.string().default("3001"),
  MONGODB_URI: z.string().optional(),
  OLLAMA_HOST: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("gemma3:4b"),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

// Parse and validate the env vars (throws if invalid)
const parsed = envSchema.parse(process.env);

// Export a typed config object for the rest of the app to use
export const config = {
  port: parseInt(parsed.PORT, 10),
  mongodbUri: parsed.MONGODB_URI,
  ollamaHost: parsed.OLLAMA_HOST,
  ollamaModel: parsed.OLLAMA_MODEL,
  elevenLabsApiKey: parsed.ELEVENLABS_API_KEY,
  elevenLabsVoiceId: parsed.ELEVENLABS_VOICE_ID,
  corsOrigin: parsed.CORS_ORIGIN,
};

// Helper that throws a clear error if MONGODB_URI was not set
export function requireMongoUri(): string {
  if (!config.mongodbUri) {
    throw new Error(
      "MONGODB_URI is required. Set it in your .env file. Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/grassquest"
    );
  }
  return config.mongodbUri;
}
