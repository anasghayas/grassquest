// Mongoose model for a Player. Tracks XP, streaks, badges, and quest history.

import { Schema, model } from "mongoose";

// Player schema matching the DATA MODELS spec
const playerSchema = new Schema(
  {
    // Unique device identifier for the player
    deviceId: { type: String, required: true, unique: true, index: true },
    // Total experience points earned
    xp: { type: Number, default: 0 },
    // Current consecutive-day streak
    streak: { type: Number, default: 0 },
    // Highest streak ever achieved
    bestStreak: { type: Number, default: 0 },
    // Date string (YYYY-MM-DD) of the last completed quest, or null
    lastCompletedDate: { type: String, default: null },
    // Array of badge IDs the player has earned
    badges: { type: [String], default: [] },
    // Total number of quests completed
    totalCompleted: { type: Number, default: 0 },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

export const Player = model("Player", playerSchema);
