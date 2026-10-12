// Pure functions for game progression: XP calculations, streaks, and badge awards.

export interface PlayerProgressData {
  deviceId: string;
  xp: number;
  streak: number;
  bestStreak: number;
  lastCompletedDate?: string | null;
  badges: string[];
  totalCompleted: number;
}

export interface QuestProgressData {
  difficulty: "easy" | "medium" | "hard";
  weather?: {
    isRaining?: boolean;
  } | null;
}

export interface CompletionResult {
  player: PlayerProgressData;
  xpGained: number;
  newBadges: string[];
}

// Calculates the previous day's date string (YYYY-MM-DD) purely in UTC
export function getYesterdayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Maps difficulty name to base XP award
function getBaseXp(difficulty: "easy" | "medium" | "hard"): number {
  switch (difficulty) {
    case "easy":
      return 10;
    case "medium":
      return 20;
    case "hard":
      return 30;
  }
}

// Determines which badges the player earns based on current state and quest conditions
function evaluateBadges(
  existingBadges: string[],
  totalCompleted: number,
  streak: number,
  isRaining: boolean
): string[] {
  const badgeRules: Array<{ id: string; earned: boolean }> = [
    { id: "first-step", earned: totalCompleted >= 1 },
    { id: "leaf-peeper", earned: totalCompleted >= 5 },
    { id: "three-day-streak", earned: streak >= 3 },
    { id: "week-warrior", earned: streak >= 7 },
    { id: "rainy-day-hero", earned: isRaining },
  ];

  const newBadges: string[] = [];
  for (const rule of badgeRules) {
    if (rule.earned && !existingBadges.includes(rule.id)) {
      newBadges.push(rule.id);
    }
  }

  return newBadges;
}

// Applies quest completion to player state, returning updated player, xpGained, and newBadges
export function applyCompletion(
  player: PlayerProgressData,
  quest: QuestProgressData,
  todayStr: string
): CompletionResult {
  const yesterday = getYesterdayStr(todayStr);

  const isRaining = quest.weather?.isRaining ?? false;

  // If already completed today, streak remains unchanged and no double XP is awarded
  if (player.lastCompletedDate === todayStr) {
    const newBadges = evaluateBadges(
      player.badges,
      player.totalCompleted,
      player.streak,
      isRaining
    );

    return {
      player: {
        ...player,
        badges: [...player.badges, ...newBadges],
      },
      xpGained: 0,
      newBadges,
    };
  }

  // Calculate streak progression
  let newStreak: number;
  if (player.lastCompletedDate === yesterday) {
    newStreak = player.streak + 1;
  } else {
    newStreak = 1;
  }

  const bestStreak = Math.max(player.bestStreak, newStreak);
  const newTotalCompleted = player.totalCompleted + 1;

  // Calculate XP: base XP + streak bonus (capped at 25)
  const baseXp = getBaseXp(quest.difficulty);
  const streakBonus = Math.min(newStreak * 5, 25);
  const xpGained = baseXp + streakBonus;

  // Evaluate newly earned badges
  const newBadges = evaluateBadges(
    player.badges,
    newTotalCompleted,
    newStreak,
    isRaining
  );

  const updatedPlayer: PlayerProgressData = {
    ...player,
    xp: player.xp + xpGained,
    streak: newStreak,
    bestStreak,
    lastCompletedDate: todayStr,
    badges: [...player.badges, ...newBadges],
    totalCompleted: newTotalCompleted,
  };

  return {
    player: updatedPlayer,
    xpGained,
    newBadges,
  };
}
