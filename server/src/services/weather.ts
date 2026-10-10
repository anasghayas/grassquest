// Weather service: fetches real-time weather from Open-Meteo for quest generation.

import { z } from "zod";

// Shape of weather data used throughout GrassQuest
export interface WeatherData {
  tempC: number;
  isRaining: boolean;
  isDay: boolean;
  code: number;
}

// Fallback weather data used if Open-Meteo is down, slow, or unreachable
export const DEFAULT_WEATHER: WeatherData = {
  tempC: 22,
  isRaining: false,
  isDay: true,
  code: 0,
};

// Zod schema to validate Open-Meteo API response structure
const openMeteoResponseSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    precipitation: z.number(),
    weather_code: z.number(),
    is_day: z.number(),
  }),
});

// Helper that determines if precipitation or WMO code indicates rain
function checkIsRaining(precipitation: number, code: number): boolean {
  if (precipitation > 0) return true;
  // WMO rain codes: 51-67 (drizzle/rain/freezing rain), 80-82 (rain showers), 95-99 (thunderstorms)
  if (code >= 51 && code <= 67) return true;
  if (code >= 80 && code <= 82) return true;
  if (code >= 95 && code <= 99) return true;
  return false;
}

// Fetches current weather for coordinates with 5-second timeout and safe fallback
export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,is_day`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      console.warn(`Weather API responded with status ${res.status}, using default`);
      return DEFAULT_WEATHER;
    }

    const json = await res.json();
    const parsed = openMeteoResponseSchema.parse(json);

    const { temperature_2m, precipitation, weather_code, is_day } = parsed.current;

    return {
      tempC: Math.round(temperature_2m * 10) / 10,
      isRaining: checkIsRaining(precipitation, weather_code),
      isDay: is_day === 1,
      code: weather_code,
    };
  } catch (error) {
    console.warn("Weather fetch failed, falling back to default:", (error as Error).message);
    return DEFAULT_WEATHER;
  }
}
