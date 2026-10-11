// Player routes: initialize player profile and retrieve player stats.

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { Player } from "../models/Player.js";

const router = Router();

// Zod schema for validating deviceId
const deviceIdSchema = z.string().min(8).max(64);

// Zod schema for initializing a player
const initPlayerSchema = z.object({
  deviceId: deviceIdSchema,
});

// Initializes or returns an existing player by deviceId
router.post("/init", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = initPlayerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        error: parseResult.error.issues[0].message,
      });
      return;
    }

    const { deviceId } = parseResult.data;

    // Check if the player already exists
    let player = await Player.findOne({ deviceId });
    if (!player) {
      // Create new player record if not found
      player = await Player.create({
        deviceId,
        xp: 0,
        streak: 0,
        bestStreak: 0,
        lastCompletedDate: null,
        badges: [],
        totalCompleted: 0,
      });
    }

    res.json({ ok: true, data: player });
  } catch (err) {
    next(err);
  }
});

// Retrieves player profile and statistics by deviceId
router.get("/:deviceId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = deviceIdSchema.safeParse(req.params.deviceId);
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        error: "Invalid deviceId parameter",
      });
      return;
    }

    const player = await Player.findOne({ deviceId: parseResult.data });
    if (!player) {
      res.status(404).json({
        ok: false,
        error: "Player not found",
      });
      return;
    }

    res.json({ ok: true, data: player });
  } catch (err) {
    next(err);
  }
});

export { router as playersRouter };
