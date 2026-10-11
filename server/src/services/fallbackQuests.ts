// Hand-written safe quests used when Ollama AI is offline or unreachable.

import type { WeatherData } from "./weather.js";

// Type matching the quest content JSON schema
export interface FallbackQuestItem {
  title: string;
  description: string;
  objective: string;
  tip: string;
  difficulty: "easy" | "medium" | "hard";
  mood: "chill" | "energetic" | "curious";
  indoorFriendly: boolean;
}

// 20 pre-written quests covering different moods, difficulties, and weather conditions
export const FALLBACK_QUESTS: FallbackQuestItem[] = [
  // 5 rainy / indoor / porch-friendly quests
  {
    title: "Raindrop Window Patterns",
    description: "Watch raindrops form unique paths on a window pane and admire nature's watercolor art.",
    objective: "A windowpane with visible water drops on the glass",
    tip: "Focus your camera closely on the water droplets.",
    difficulty: "easy",
    mood: "chill",
    indoorFriendly: true,
  },
  {
    title: "Porch Puddle Reflection",
    description: "Step onto a covered doorstep or porch to find a puddle mirroring the sky.",
    objective: "A puddle showing sky or cloud reflections",
    tip: "Get low to catch the reflection without stepping in the water.",
    difficulty: "easy",
    mood: "curious",
    indoorFriendly: true,
  },
  {
    title: "Indoor Leaf Inspector",
    description: "Take a close look at a houseplant or potted green leaf near an open doorway.",
    objective: "A vibrant green potted plant leaf",
    tip: "Look for natural lighting from a nearby window.",
    difficulty: "easy",
    mood: "chill",
    indoorFriendly: true,
  },
  {
    title: "Doorstep Cloud Watcher",
    description: "Stand safely under a porch roof and observe the shifting rain clouds above.",
    objective: "Overcast storm or rain clouds in the sky",
    tip: "Point your camera upward from the safety of your doorstep.",
    difficulty: "medium",
    mood: "curious",
    indoorFriendly: true,
  },
  {
    title: "Balcony Stretch and Spot",
    description: "Do a quick stretch on your balcony or porch while spotting a raindrop on a railing.",
    objective: "A glistening water droplet clinging to an outdoor railing",
    tip: "Steady your hands to capture the tiny drop clearly.",
    difficulty: "medium",
    mood: "energetic",
    indoorFriendly: true,
  },

  // 15 outdoor quests
  {
    title: "Smooth Stone Discovery",
    description: "Take a gentle stroll on a park path and look down to find a smooth, weathered pebble.",
    objective: "A smooth rounded pebble resting on the ground",
    tip: "Look along path borders or garden mulch beds.",
    difficulty: "easy",
    mood: "chill",
    indoorFriendly: false,
  },
  {
    title: "Green Moss Patch",
    description: "Stroll along shaded stone walls or tree bases to discover velvet green moss.",
    objective: "A patch of soft green moss on bark or stone",
    tip: "North-facing shaded surfaces are great spots for moss.",
    difficulty: "easy",
    mood: "chill",
    indoorFriendly: false,
  },
  {
    title: "Sunbeam Shadowplay",
    description: "Wander under leafy trees and observe how afternoon light casts branch shadows.",
    objective: "Distinct leafy branch shadows cast on grass or path",
    tip: "Look for areas where direct sunlight filters through foliage.",
    difficulty: "medium",
    mood: "chill",
    indoorFriendly: false,
  },
  {
    title: "Dry Pinecone Scout",
    description: "Enjoy a tranquil walk beneath evergreen boughs and spot a fallen pinecone on the soil.",
    objective: "A fallen pinecone resting peacefully on ground or grass",
    tip: "Evergreen and pine trees usually drop cones near their base.",
    difficulty: "medium",
    mood: "chill",
    indoorFriendly: false,
  },
  {
    title: "Wild Clover Cluster",
    description: "Take a calming breath, pause on a lawn, and look for a patch of three-leaf clovers.",
    objective: "A cluster of wild three-leaf clovers growing in grass",
    tip: "Look closely at untrimmed grass patches in lawns or parks.",
    difficulty: "easy",
    mood: "chill",
    indoorFriendly: false,
  },
  {
    title: "Fascinating Tree Bark Texture",
    description: "Examine the rugged ridges and patterns on the trunk of an old mature tree.",
    objective: "Close-up of textured tree trunk bark",
    tip: "Old oak or birch trees have wonderful tactile patterns.",
    difficulty: "easy",
    mood: "curious",
    indoorFriendly: false,
  },
  {
    title: "Yellow Petal Finder",
    description: "Search nearby meadows or garden borders for a bright, cheerful yellow blossom.",
    objective: "A bright open yellow flower blossom",
    tip: "Dandelions, buttercups, and garden marigolds count!",
    difficulty: "easy",
    mood: "curious",
    indoorFriendly: false,
  },
  {
    title: "Serrated Leaf Architecture",
    description: "Observe the intricate toothed edges and veins of a wild bush or shrub leaf.",
    objective: "A single leaf with visible toothed or serrated edges",
    tip: "Hold the leaf gently toward the light to reveal its veins.",
    difficulty: "medium",
    mood: "curious",
    indoorFriendly: false,
  },
  {
    title: "Fallen Acorn or Seed Pod",
    description: "Comb the forest edge or park green for seed pods that dropped from the canopy.",
    objective: "An acorn, seed capsule, or dried seed pod on earth",
    tip: "Search beneath tall oak trees or flowering bushes.",
    difficulty: "medium",
    mood: "curious",
    indoorFriendly: false,
  },
  {
    title: "Twin-Tone Foliage Search",
    description: "Seek out a plant or shrub whose leaves display two distinct colors or variegation.",
    objective: "A variegated plant leaf showing two different colors",
    tip: "Check garden borders and ornamental landscaping bushes.",
    difficulty: "hard",
    mood: "curious",
    indoorFriendly: false,
  },
  {
    title: "Park Bench Pit Stop",
    description: "Briskly walk to the farthest park bench you can spot in your local park.",
    objective: "A wooden or metal outdoor park bench",
    tip: "Keep up a good walking pace until you reach the bench.",
    difficulty: "easy",
    mood: "energetic",
    indoorFriendly: false,
  },
  {
    title: "Hilltop Horizon Gaze",
    description: "Power walk up a small knoll, rise, or bridge to capture the distant horizon.",
    objective: "An open view of the distant sky or horizon from elevated ground",
    tip: "Focus on deep breaths as you power your way to the top.",
    difficulty: "medium",
    mood: "energetic",
    indoorFriendly: false,
  },
  {
    title: "Trail Marker Sprint",
    description: "Jog or walk swiftly along a walking trail until you encounter a trail sign or marker.",
    objective: "A trail marker, footpath signpost, or park distance post",
    tip: "Follow designated recreation paths and pedestrian walkways.",
    difficulty: "medium",
    mood: "energetic",
    indoorFriendly: false,
  },
  {
    title: "Five-Minute Pathway Challenge",
    description: "Keep a brisk stride along a winding public path to reach an archway or pergola.",
    objective: "An outdoor wooden archway, pergola, or decorative park gate",
    tip: "Maintain an elevated heart rate with a purposeful walking cadence.",
    difficulty: "hard",
    mood: "energetic",
    indoorFriendly: false,
  },
  {
    title: "Stepping Stone Stride",
    description: "Track down a stone walkway and stride across it with energy and focus.",
    objective: "A stone pathway or garden stepping stones across grass",
    tip: "Mind your footing while maintaining an upbeat pace.",
    difficulty: "hard",
    mood: "energetic",
    indoorFriendly: false,
  },
];

// Picks a suitable fallback quest matching user mood and current weather conditions
export function getFallbackQuest(
  mood: "chill" | "energetic" | "curious",
  weather: WeatherData
): {
  title: string;
  description: string;
  objective: string;
  tip: string;
  difficulty: "easy" | "medium" | "hard";
} {
  const needsIndoor = weather.isRaining || !weather.isDay;

  // Filter pool by weather requirements
  let candidates = FALLBACK_QUESTS.filter((q) => q.indoorFriendly === needsIndoor);

  // If none match exact weather, fall back to entire pool
  if (candidates.length === 0) {
    candidates = FALLBACK_QUESTS;
  }

  // Filter further by user's chosen mood
  const moodMatched = candidates.filter((q) => q.mood === mood);
  const finalPool = moodMatched.length > 0 ? moodMatched : candidates;

  // Pick a random quest from the pool
  const randomIndex = Math.floor(Math.random() * finalPool.length);
  const selected = finalPool[randomIndex];

  return {
    title: selected.title,
    description: selected.description,
    objective: selected.objective,
    tip: selected.tip,
    difficulty: selected.difficulty,
  };
}
