// Health check routes for server, database, and Ollama AI readiness.

import { Router, type Request, type Response } from "express";
import { getDbStatus } from "../db.js";
import { isAiReady } from "../services/ollama.js";
import { config } from "../config.js";

const router = Router();

// Returns server status and database connection state
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: {
      status: "up",
      db: getDbStatus(),
    },
  });
});

// Returns whether the Ollama AI service is reachable and ready with the requested model
router.get("/ai/health", async (_req: Request, res: Response) => {
  const ready = await isAiReady();
  res.json({
    ok: true,
    data: {
      ready,
      model: config.ollamaModel,
    },
  });
});

export { router as healthRouter };
