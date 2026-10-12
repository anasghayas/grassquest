// Quest routes: retrieve, generate, and verify daily quests for players.

import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { z } from "zod";
import { Quest } from "../models/Quest.js";
import { Player } from "../models/Player.js";
import { getWeather } from "../services/weather.js";
import { generateQuest } from "../services/questGenerator.js";
import { verifyPhoto } from "../services/verifier.js";
import { applyCompletion } from "../services/progress.js";

const router = Router();

// Multer memoryStorage configuration: in-memory only, 3 MB limit, image types only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
  },
});

// Middleware to handle multer file upload errors gracefully
function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("photo")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ ok: false, error: "Photo exceeds 3 MB limit" });
        return;
      }
      res.status(400).json({ ok: false, error: err.message });
      return;
    } else if (err) {
      res.status(400).json({ ok: false, error: err.message });
      return;
    }
    next();
  });
}

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

// Verifies a submitted photo for a quest and updates game progress if successful
router.post("/:id/verify", handleUpload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deviceId = req.body.deviceId;

    // Validate quest ID format
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ ok: false, error: "Invalid quest ID" });
      return;
    }

    // Validate deviceId
    if (!deviceId || typeof deviceId !== "string" || deviceId.length < 8 || deviceId.length > 64) {
      res.status(400).json({ ok: false, error: "A valid deviceId (8-64 chars) is required" });
      return;
    }

    // Validate uploaded photo file
    if (!req.file) {
      res.status(400).json({ ok: false, error: "Photo file is required (JPEG, PNG, or WebP up to 3 MB)" });
      return;
    }

    // Retrieve quest from database
    const quest = await Quest.findById(id);
    if (!quest) {
      res.status(404).json({ ok: false, error: "Quest not found" });
      return;
    }

    // Ensure the submitting device owns the quest
    if (quest.deviceId !== deviceId) {
      res.status(403).json({ ok: false, error: "Forbidden: deviceId does not match quest owner" });
      return;
    }

    // Check if the quest is already completed
    if (quest.status === "completed") {
      res.status(409).json({
        ok: false,
        error: "Quest is already completed",
      });
      return;
    }

    // Process photo in memory (never written to disk)
    const photoBase64 = req.file.buffer.toString("base64");

    // Verify photo with Gemma or fallback to honor
    const verification = await verifyPhoto({
      photoBase64,
      objective: quest.objective,
    });

    // If verification failed, return reason and keep quest active
    if (!verification.success) {
      res.json({
        ok: true,
        data: {
          success: false,
          reason: verification.reason,
        },
      });
      return;
    }

    // If verification succeeded, mark quest as completed
    quest.status = "completed";
    quest.verifiedBy = verification.verifiedBy;
    quest.completedAt = new Date();
    await quest.save();

    // Fetch or initialize player record
    let player = await Player.findOne({ deviceId: quest.deviceId });
    if (!player) {
      player = await Player.create({
        deviceId: quest.deviceId,
        xp: 0,
        streak: 0,
        bestStreak: 0,
        lastCompletedDate: null,
        badges: [],
        totalCompleted: 0,
      });
    }

    // Apply progression rules: XP, streaks, and badges
    const { player: updatedState, xpGained, newBadges } = applyCompletion(
      {
        deviceId: player.deviceId,
        xp: player.xp,
        streak: player.streak,
        bestStreak: player.bestStreak,
        lastCompletedDate: player.lastCompletedDate ?? null,
        badges: player.badges,
        totalCompleted: player.totalCompleted,
      },
      {
        difficulty: quest.difficulty,
        weather: {
          isRaining: quest.weather?.isRaining ?? false,
        },
      },
      quest.date
    );

    // Persist updated player progress
    player.xp = updatedState.xp;
    player.streak = updatedState.streak;
    player.bestStreak = updatedState.bestStreak;
    player.lastCompletedDate = updatedState.lastCompletedDate;
    player.badges = updatedState.badges;
    player.totalCompleted = updatedState.totalCompleted;
    await player.save();

    res.json({
      ok: true,
      data: {
        success: true,
        reason: verification.reason,
        xpGained,
        newBadges,
        player,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as questsRouter };
