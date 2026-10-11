// Quest routes: retrieve or generate the daily quest for a player.

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { Quest } from "../models/Quest.js";
import { getWeather } from "../services/weather.js";
import { generateQuest } from "../services/questGenerator.js";

const router = Router();

// Zod schema for validating the POST /today request body
const todayQuestSchema = z.object({
  deviceId: z.string().min(8).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  mood: z.enum(["chill", "energetic", "curious"]),
});

// Retrieves today's existing quest or generates and saves a new one
router.post("/today", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = todayQuestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        error: parseResult.error.issues[0].message,
      });
      return;
    }

    const { deviceId, date, lat, lon, mood } = parseResult.data;

    // Check if a quest was already generated for this device and date
    const existingQuest = await Quest.findOne({ deviceId, date });
    if (existingQuest) {
      res.json({ ok: true, data: existingQuest });
      return;
    }

    // Fetch current weather for the given location
    const weather = await getWeather(lat, lon);

    // Generate quest using Gemma, with graceful fallback to preset quests
    const { quest: content, source } = await generateQuest(mood, weather);

    // Save the new quest to the database
    try {
      const newQuest = await Quest.create({
        deviceId,
        date,
        title: content.title,
        description: content.description,
        objective: content.objective,
        tip: content.tip,
        difficulty: content.difficulty,
        mood,
        weather,
        source,
        status: "active",
        verifiedBy: null,
        completedAt: null,
      });

      res.json({ ok: true, data: newQuest });
    } catch (saveError) {
      // Handle potential race condition if quest was created concurrently
      if ((saveError as { code?: number }).code === 11000) {
        const raceQuest = await Quest.findOne({ deviceId, date });
        if (raceQuest) {
          res.json({ ok: true, data: raceQuest });
          return;
        }
      }
      throw saveError;
    }
  } catch (err) {
    next(err);
  }
});

export { router as questsRouter };
