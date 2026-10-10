// Creates and configures the Express app with middleware and routes.

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { config } from "./config.js";
import { getDbStatus } from "./db.js";

// Create the Express app
const app = express();

// --- Middleware ---

// Parse incoming JSON request bodies
app.use(express.json());

// Allow cross-origin requests from the web frontend
app.use(cors({ origin: config.corsOrigin }));

// --- Routes ---

// Health check: returns server status and database connection state
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, data: { status: "up", db: getDbStatus() } });
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
