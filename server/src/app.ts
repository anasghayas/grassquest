// Creates and configures the Express app with middleware and routes.

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { z } from "zod";
import { config } from "./config.js";
import { healthRouter } from "./routes/health.js";
import { getWeather } from "./services/weather.js";

// Create the Express app
const app = express();

// --- Middleware ---

// Parse incoming JSON request bodies
app.use(express.json());

// Allow cross-origin requests from the web frontend
app.use(cors({ origin: config.corsOrigin }));

// --- Routes ---

// Health and AI health routes (/api/health, /api/ai/health)
app.use("/api", healthRouter);

// Debug weather route: fetches real weather for coordinates (dev only)
app.get("/api/debug/weather", async (req: Request, res: Response) => {
  const querySchema = z.object({
    lat: z.coerce.number().default(28.6139),
    lon: z.coerce.number().default(77.209),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.issues[0].message });
    return;
  }

  const weather = await getWeather(parsed.data.lat, parsed.data.lon);
  res.json({ ok: true, data: weather });
});

// --- Error Handling ---

// 404 handler: catches any request that didn't match a route above
app.use((_req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

// Global error handler: catches any error thrown in a route or middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

export { app };
