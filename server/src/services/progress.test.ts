// Unit tests for GrassQuest progression logic: XP, streaks, badges, and date calculations.

import { describe, it, expect } from "vitest";
import {
  applyCompletion,
  getYesterdayStr,
  type PlayerProgressData,
  type QuestProgressData,
} from "./progress.js";

// Helper to create a clean initial player state
function createTestPlayer(overrides: Partial<PlayerProgressData> = {}): PlayerProgressData {
  return {
    deviceId: "test-device-id",
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    badges: [],
    totalCompleted: 0,
    ...overrides,
  };
}

// Helper to create a quest object
function createTestQuest(overrides: Partial<QuestProgressData> = {}): QuestProgressData {
  return {
    difficulty: "easy",
    weather: {
      isRaining: false,
    },
    ...overrides,
  };
}

describe("Date calculation (getYesterdayStr)", () => {
  it("calculates the previous day correctly for standard days", () => {
    expect(getYesterdayStr("2026-10-12")).toBe("2026-10-11");
    expect(getYesterdayStr("2026-05-15")).toBe("2026-05-14");
  });

  it("handles month boundaries correctly", () => {
    expect(getYesterdayStr("2026-03-01")).toBe("2026-02-28");
    expect(getYesterdayStr("2026-05-01")).toBe("2026-04-30");
  });

  it("handles leap year February correctly", () => {
    expect(getYesterdayStr("2024-03-01")).toBe("2024-02-29");
  });

  it("handles year boundaries correctly", () => {
    expect(getYesterdayStr("2026-01-01")).toBe("2025-12-31");
  });
});

describe("First completion", () => {
  it("awards initial XP, sets streak to 1, and grants first-step badge", () => {
    const player = createTestPlayer();
    const quest = createTestQuest({ difficulty: "easy" });
    const today = "2026-10-12";

    const result = applyCompletion(player, quest, today);

    // Easy quest (10 XP) + streak 1 bonus (5 XP) = 15 XP
    expect(result.xpGained).toBe(15);
    expect(result.player.xp).toBe(15);
    expect(result.player.streak).toBe(1);
    expect(result.player.bestStreak).toBe(1);
    expect(result.player.totalCompleted).toBe(1);
    expect(result.player.lastCompletedDate).toBe(today);
    expect(result.newBadges).toEqual(["first-step"]);
    expect(result.player.badges).toEqual(["first-step"]);
  });
});

describe("Consecutive-day streak", () => {
  it("increments streak and calculates streak bonus correctly", () => {
    const player = createTestPlayer({
      xp: 15,
      streak: 1,
      bestStreak: 1,
      lastCompletedDate: "2026-10-11",
      totalCompleted: 1,
      badges: ["first-step"],
    });
    const quest = createTestQuest({ difficulty: "medium" });
    const today = "2026-10-12";

    const result = applyCompletion(player, quest, today);

    // Medium quest (20 XP) + streak 2 bonus (2 * 5 = 10 XP) = 30 XP
    expect(result.xpGained).toBe(30);
    expect(result.player.xp).toBe(45);
    expect(result.player.streak).toBe(2);
    expect(result.player.bestStreak).toBe(2);
    expect(result.player.totalCompleted).toBe(2);
    expect(result.player.lastCompletedDate).toBe(today);
    expect(result.newBadges).toEqual([]);
    expect(result.player.badges).toEqual(["first-step"]);
  });
});

describe("Same-day completion (no double XP)", () => {
  it("does not increment streak, does not award double XP, and keeps totalCompleted unchanged", () => {
    const player = createTestPlayer({
      xp: 45,
      streak: 2,
      bestStreak: 2,
      lastCompletedDate: "2026-10-12",
      totalCompleted: 2,
      badges: ["first-step"],
    });
    const quest = createTestQuest({ difficulty: "hard" });
    const today = "2026-10-12";

    const result = applyCompletion(player, quest, today);

    expect(result.xpGained).toBe(0);
    expect(result.player.xp).toBe(45);
    expect(result.player.streak).toBe(2);
    expect(result.player.bestStreak).toBe(2);
    expect(result.player.totalCompleted).toBe(2);
    expect(result.newBadges).toEqual([]);
    expect(result.player.badges).toEqual(["first-step"]);
  });
});

describe("Broken streak reset", () => {
  it("resets current streak to 1 when a day is skipped, while keeping bestStreak intact", () => {
    const player = createTestPlayer({
      xp: 100,
      streak: 5,
      bestStreak: 5,
      lastCompletedDate: "2026-10-09", // Two days ago, skipped 2026-10-10
      totalCompleted: 5,
      badges: ["first-step", "leaf-peeper", "three-day-streak"],
    });
    const quest = createTestQuest({ difficulty: "easy" });
    const today = "2026-10-11";

    const result = applyCompletion(player, quest, today);

    // Reset to streak 1: easy (10) + streak 1 bonus (5) = 15 XP
    expect(result.xpGained).toBe(15);
    expect(result.player.xp).toBe(115);
    expect(result.player.streak).toBe(1);
    expect(result.player.bestStreak).toBe(5); // Retains highest historical streak
    expect(result.player.totalCompleted).toBe(6);
    expect(result.player.lastCompletedDate).toBe(today);
  });
});

describe("Streak bonus cap", () => {
  it("caps streak bonus at 25 XP even for high streaks", () => {
    // Player on streak 5, completing day 6 (streak becomes 6 -> 6 * 5 = 30, capped at 25)
    const player1 = createTestPlayer({
      streak: 5,
      bestStreak: 5,
      lastCompletedDate: "2026-10-11",
      totalCompleted: 5,
    });
    const hardQuest = createTestQuest({ difficulty: "hard" });
    const result1 = applyCompletion(player1, hardQuest, "2026-10-12");

    // Hard base (30) + max streak bonus (25) = 55 XP
    expect(result1.xpGained).toBe(55);
    expect(result1.player.streak).toBe(6);

    // Player on streak 10, completing day 11 (streak becomes 11 -> 11 * 5 = 55, capped at 25)
    const player2 = createTestPlayer({
      streak: 10,
      bestStreak: 10,
      lastCompletedDate: "2026-10-11",
      totalCompleted: 10,
    });
    const result2 = applyCompletion(player2, hardQuest, "2026-10-12");

    // Hard base (30) + max streak bonus (25) = 55 XP
    expect(result2.xpGained).toBe(55);
    expect(result2.player.streak).toBe(11);
  });
});

describe("Badges", () => {
  it("awards first-step badge on first completion", () => {
    const player = createTestPlayer();
    const quest = createTestQuest();
    const result = applyCompletion(player, quest, "2026-10-12");

    expect(result.newBadges).toContain("first-step");
    expect(result.player.badges).toContain("first-step");
  });

  it("awards leaf-peeper badge when totalCompleted reaches 5", () => {
    const player = createTestPlayer({
      totalCompleted: 4,
      lastCompletedDate: "2026-10-11",
      badges: ["first-step"],
    });
    const quest = createTestQuest();
    const result = applyCompletion(player, quest, "2026-10-12");

    expect(result.newBadges).toContain("leaf-peeper");
    expect(result.player.badges).toContain("leaf-peeper");
    expect(result.player.badges).toContain("first-step");
  });

  it("awards three-day-streak badge when streak reaches 3", () => {
    const player = createTestPlayer({
      streak: 2,
      lastCompletedDate: "2026-10-11",
      totalCompleted: 2,
      badges: ["first-step"],
    });
    const quest = createTestQuest();
    const result = applyCompletion(player, quest, "2026-10-12");

    expect(result.player.streak).toBe(3);
    expect(result.newBadges).toContain("three-day-streak");
    expect(result.player.badges).toContain("three-day-streak");
  });

  it("awards week-warrior badge when streak reaches 7", () => {
    const player = createTestPlayer({
      streak: 6,
      lastCompletedDate: "2026-10-11",
      totalCompleted: 6,
      badges: ["first-step", "leaf-peeper", "three-day-streak"],
    });
    const quest = createTestQuest();
    const result = applyCompletion(player, quest, "2026-10-12");

    expect(result.player.streak).toBe(7);
    expect(result.newBadges).toContain("week-warrior");
    expect(result.player.badges).toContain("week-warrior");
  });

  it("awards rainy-day-hero badge when completed during rain", () => {
    const player = createTestPlayer({
      lastCompletedDate: "2026-10-11",
      badges: ["first-step"],
    });
    const rainyQuest = createTestQuest({
      weather: { isRaining: true },
    });
    const result = applyCompletion(player, rainyQuest, "2026-10-12");

    expect(result.newBadges).toContain("rainy-day-hero");
    expect(result.player.badges).toContain("rainy-day-hero");
  });

  it("does not award rainy-day-hero badge when not raining", () => {
    const player = createTestPlayer({
      lastCompletedDate: "2026-10-11",
      badges: ["first-step"],
    });
    const dryQuest = createTestQuest({
      weather: { isRaining: false },
    });
    const result = applyCompletion(player, dryQuest, "2026-10-12");

    expect(result.newBadges).not.toContain("rainy-day-hero");
    expect(result.player.badges).not.toContain("rainy-day-hero");
  });

  it("does not duplicate already earned badges", () => {
    const player = createTestPlayer({
      streak: 3,
      totalCompleted: 5,
      lastCompletedDate: "2026-10-11",
      badges: ["first-step", "leaf-peeper", "three-day-streak", "rainy-day-hero"],
    });
    const rainyQuest = createTestQuest({
      weather: { isRaining: true },
    });
    const result = applyCompletion(player, rainyQuest, "2026-10-12");

    expect(result.newBadges).toEqual([]);
    expect(result.player.badges).toEqual([
      "first-step",
      "leaf-peeper",
      "three-day-streak",
      "rainy-day-hero",
    ]);
  });
});
