// Mongoose model for a Quest. One quest per player per day.

import { Schema, model } from "mongoose";

// Quest schema matching the DATA MODELS spec
const questSchema = new Schema(
  {
    // The device ID of the player who owns this quest
    deviceId: { type: String, required: true },
    // The date this quest is for (YYYY-MM-DD)
    date: { type: String, required: true },
    // Short quest title (max 60 chars)
    title: { type: String, required: true },
    // Quest description (max 200 chars)
    description: { type: String, required: true },
    // Concrete thing the photo must show (max 100 chars)
    objective: { type: String, required: true },
    // Helpful tip for completing the quest (max 100 chars)
    tip: { type: String, required: true },
    // How hard the quest is
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    // Player's chosen mood for this quest
    mood: {
      type: String,
      enum: ["chill", "energetic", "curious"],
      required: true,
    },
    // Weather conditions when the quest was generated
    weather: {
      tempC: { type: Number, required: true },
      isRaining: { type: Boolean, required: true },
      isDay: { type: Boolean, required: true },
      code: { type: Number, required: true },
    },
    // Where the quest came from: AI model or hardcoded fallback
    source: {
      type: String,
      enum: ["gemma", "fallback"],
      required: true,
    },
    // Whether the quest is still active or has been completed
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    // How the quest photo was verified (null if not yet completed)
    verifiedBy: {
      type: String,
      enum: ["gemma", "honor", null],
      default: null,
    },
    // When the quest was completed (null if still active)
    completedAt: { type: Date, default: null },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// Ensure only one quest per player per day
questSchema.index({ deviceId: 1, date: 1 }, { unique: true });

export const Quest = model("Quest", questSchema);
