# GRASSQUEST: PROJECT SPEC (read fully before every step)

## Goal

GrassQuest: a mobile-first web app giving one outdoor quest per day based on local weather and mood. User takes a photo; a local open-weight model (Gemma via Ollama) verifies it. XP, streaks, badges. Built by a beginner in 2 days.

## GLOBAL RULES (follow strictly)

1. Do ONLY the step requested. Do not start the next step. Do not add features, files, or dependencies not listed.
2. Language: TypeScript everywhere (strict mode). No Python. ES modules.
3. NEVER guess a library API. If unsure, read the installed package's types/README in node_modules or its official docs. If still unsure, say so and ask.
4. Keep code simple and commented for a beginner: short functions, clear names, a one-line comment above each function.
5. Never hardcode secrets. Use env vars only. Never commit `.env`.
6. Validate all external input (request bodies, AI output, env) with Zod.
7. Every API response is JSON: success `{ ok: true, data }`, failure `{ ok: false, error: "message" }` with a proper HTTP status.
8. Never store uploaded photos. Process them in memory only.
9. At the end of every step, output exactly: (a) files created/changed, (b) commands to run and manually test, (c) expected result, (d) a suggested git commit message in conventional-commit style. Then STOP and wait.
10. Run typecheck/build before finishing each step and fix errors.
11. Keep replies short. No long explanations.

## STACK (do not substitute)

- Monorepo using npm workspaces: `server/` and `web/`
- server: Node 20+, Express (latest stable), TypeScript, tsx (dev runner), zod, mongoose, dotenv, cors, multer, ollama (official npm package), vitest
- web: Vite + React + TypeScript + Tailwind CSS (use the current official Tailwind setup for Vite), canvas-confetti
- DB: MongoDB Atlas (via MONGODB_URI)
- AI: Ollama at OLLAMA_HOST (default http://127.0.0.1:11434), model from OLLAMA_MODEL (default gemma3:4b)
- Weather: Open-Meteo (no key)
- Voice: ElevenLabs TTS (optional), fallback to browser speechSynthesis

## FOLDER STRUCTURE

```
grassquest/
  package.json            (workspaces: server, web)
  README.md  LICENSE(MIT)  .gitignore  .env.example  PROJECT_SPEC.md
  server/
    package.json  tsconfig.json
    src/
      index.ts            (start server)
      app.ts              (express app, middleware, routes)
      config.ts           (zod-validated env)
      db.ts               (mongoose connect)
      models/Player.ts  models/Quest.ts
      services/ollama.ts weather.ts questGenerator.ts verifier.ts
               progress.ts progress.test.ts fallbackQuests.ts tts.ts
      routes/health.ts players.ts quests.ts tts.ts
  web/
    src/
      main.tsx App.tsx api.ts index.css
      lib/device.ts image.ts
      components/ (Header, MoodPicker, QuestCard, PhotoCapture, BadgeGrid, OfflineBanner)
      screens/ (Home, Quest, Result, Profile)
```

## ENV VARS (.env.example)

```
PORT=3001
MONGODB_URI=
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
CORS_ORIGIN=http://localhost:5173
```

Web env: `VITE_API_URL=http://localhost:3001`

## DATA MODELS

Player: deviceId (string, unique, indexed), xp (number, 0), streak (0), bestStreak (0), lastCompletedDate (string YYYY-MM-DD | null), badges (string[]), totalCompleted (0), timestamps.
Quest: deviceId, date (YYYY-MM-DD), title, description, objective, tip, difficulty ("easy"|"medium"|"hard"), mood ("chill"|"energetic"|"curious"), weather {tempC:number, isRaining:boolean, isDay:boolean, code:number}, source ("gemma"|"fallback"), status ("active"|"completed", default active), verifiedBy ("gemma"|"honor"|null), completedAt (Date|null), timestamps. Unique compound index on (deviceId, date).

## GAME RULES (progress.ts, pure functions, unit tested)

- XP: easy 10, medium 20, hard 30, plus streak bonus = min(newStreak\*5, 25).
- Streak: lastCompletedDate === yesterday -> streak+1; === today -> unchanged (and no double XP); else -> 1. bestStreak = max.
- Badges (id): first-step (totalCompleted>=1), leaf-peeper (>=5), three-day-streak (streak>=3), week-warrior (streak>=7), rainy-day-hero (completed while weather.isRaining).
- Function: applyCompletion(player, quest, todayStr) -> { player, xpGained, newBadges }. Date math must work on YYYY-MM-DD strings supplied by the client (no server-timezone dependence).

## AI RULES

- Quest generation: call Ollama chat with `format` set to a JSON schema derived from the Zod schema (use zod's built-in JSON-schema conversion if available in the installed zod version, otherwise the `zod-to-json-schema` package), stream:false, temperature 0.8, options.num_ctx 2048, keep_alive "30m". Parse and validate output with Zod; retry once on failure; then use a fallback quest.
- Quest JSON: { title (max 60 chars), description (max 200), objective (max 100, a concrete visible thing a photo must contain), tip (max 100), difficulty }.
- Quest safety rules to put in the prompt: safe, legal, free, no trespassing, no climbing, no touching wildlife, stay away from roads and water edges, no strangers. If raining or not daytime: window/porch/doorstep or very short walk quests only. Match difficulty/energy to mood. Never repeat generic "take a walk".
- Verification: send the photo (base64, in `images` of the user message) plus the quest objective. Return JSON { matches:boolean, confidence:number(0-1), reason:string(max 140, kind and encouraging) } using `format` schema. Be lenient: accept if the photo reasonably shows the objective. Success = matches && confidence >= 0.5. Timeout 120s.
- If Ollama is unreachable or the model is missing: quest -> random fallback quest (source "fallback"); verification -> accept with verifiedBy "honor". The API must never crash because of AI being offline.

## FALLBACK QUESTS

fallbackQuests.ts exports 20 hand-written safe quests (typed same as the quest JSON), including 5 rainy/indoor-friendly ones. A helper picks one by mood and weather.

## STEPS

### STEP 1: Repo scaffold

Create root package.json with npm workspaces (server, web), .gitignore (node_modules, dist, .env, \*.log), .env.example, README.md (title, one-paragraph pitch, "work in progress"), MIT LICENSE (year 2026), and keep PROJECT_SPEC.md. Create empty server/ and web/ folders with their own package.json (names @grassquest/server, @grassquest/web). No dependencies yet. Commit msg: `chore: scaffold monorepo`.

### STEP 2: Server skeleton

In server/: install deps (express, cors, dotenv, zod; dev: typescript, tsx, @types/node, @types/express, @types/cors). tsconfig strict, ESM. config.ts parses env with Zod (MONGODB_URI required later, optional now with clear error when used). app.ts: express.json, cors with CORS_ORIGIN, GET /api/health returns {ok:true,data:{status:"up"}}, a 404 handler, a global error handler using the response format. index.ts starts on PORT. Scripts: dev (tsx watch src/index.ts), build, start, typecheck. Test: curl /api/health.

### STEP 3: MongoDB + models

Add mongoose. db.ts connect(); on startup connect and log success; fail with clear message if URI missing/invalid. Create Player and Quest models exactly per DATA MODELS. Extend /api/health to include db: "connected"|"disconnected". Test: health shows connected.

### STEP 4: Ollama service + AI health

Add `ollama` package. services/ollama.ts: create a client using OLLAMA_HOST; export isAiReady() (checks server reachable and that OLLAMA_MODEL is in the pulled model list) and a thin chatJson(...) helper wrapping chat with format schema + Zod validation + timeout. Route GET /api/ai/health -> {ok:true,data:{ready:boolean, model}}. Test with Ollama running and stopped.

### STEP 5: Weather service

services/weather.ts: getWeather(lat, lon) calls Open-Meteo forecast endpoint with `current=temperature_2m,precipitation,weather_code,is_day`; returns {tempC,isRaining,isDay,code} (isRaining = precipitation>0 or WMO code in 51-67, 80-82, 95-99). Zod-validate the response, 5s timeout, and on failure return a safe default {tempC:22,isRaining:false,isDay:true,code:0}. Add a quick test script or curl-able debug route GET /api/debug/weather?lat=&lon= (dev only, remove-able).

### STEP 6: Quest generation + endpoints

Create fallbackQuests.ts, questGenerator.ts, routes/players.ts (POST /api/players/init, GET /api/players/:deviceId) and routes/quests.ts: POST /api/quests/today. Body validated {deviceId (8-64 chars), date (YYYY-MM-DD), lat, lon, mood}. If a quest already exists for (deviceId,date) return it. Else get weather, generate with Gemma (fall back if needed), save, return. Test with curl: first call creates, second returns same quest; also test with Ollama stopped.

### STEP 7: Photo verification endpoint

services/verifier.ts + POST /api/quests/:id/verify using multer memoryStorage (limit 3 MB, images only: jpeg/png/webp). Field deviceId must own the quest. If quest already completed return 409 with the existing result. Verify with Gemma (or honor fallback). If success: mark quest completed, update player using progress.applyCompletion (create progress.ts in this step with a minimal correct implementation), return {success, reason, xpGained, newBadges, player}. If fail: return {success:false, reason} and keep quest active. Never persist the image. Test with curl -F photo=@test.jpg.

### STEP 8: Progress logic tests

Add vitest. Write progress.test.ts covering: first completion, consecutive-day streak, same-day no double XP, broken streak reset, streak bonus cap, each badge, rainy-day-hero. Fix any bug found in progress.ts. Add script `test`. Commit msg: `test: cover streak, xp and badges`.

### STEP 9: Web scaffold

In web/: create Vite React TS app (npm workspace), add Tailwind per its current official Vite setup, canvas-confetti. Green/cream theme with CSS variables, mobile-first (max-w-md centered), clean base styles, a simple App with a placeholder header "GrassQuest 🌿". VITE_API_URL env. Test: `npm run dev -w web`.

### STEP 10: API client + device identity + location

lib/device.ts: getDeviceId() creates a crypto.randomUUID() stored in localStorage. api.ts: typed fetch helpers for every endpoint with the {ok,data,error} format, throwing readable errors. A useLocation hook/helper: geolocation with a 8s timeout; if denied use a default lat/lon (28.6139, 77.2090) and show a small note. A helper todayStr() returning the user's local date as YYYY-MM-DD. On load call players/init. Test in browser console/network tab.

### STEP 11: Home + Quest screens

Header (streak flame + XP), MoodPicker (3 chips), OfflineBanner (calls /api/ai/health, shows when not ready), Home screen with "Get my quest" -> calls quests/today with a spinner and rotating friendly messages while waiting (CPU generation may take ~20s), then QuestCard screen showing title, description, tip, weather chip (emoji + temp), difficulty chip. Simple state-based screen switching in App.tsx (no router). If the quest is already completed today show a "Done for today 🎉" state.

### STEP 12: Photo capture + Result screen

lib/image.ts: resizeImage(file, maxSide=512) via canvas -> JPEG blob (quality 0.8). PhotoCapture: `<input type="file" accept="image/*" capture="environment">` styled as a big button, with a preview. On submit send to /verify. Result screen: loading state "Gemma is looking at your photo…" (up to 60s, with a cancel/back button), success view with confetti, XP gained, new badges; failure view with Gemma's reason and "Try another photo". Update header XP/streak after success.

### STEP 13: Profile screen

Bottom tab bar (Quest | Profile). Profile: XP, streak, best streak, total quests, BadgeGrid showing all 5 badges with name, emoji, and requirement; locked ones greyed. Data from GET /api/players/:deviceId.

### STEP 14: Voice (ElevenLabs + fallback)

Server: services/tts.ts + POST /api/tts {text (max 400 chars)} calls ElevenLabs text-to-speech REST endpoint with ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (check the official docs for the exact URL/headers/model_id), returns audio/mpeg. If keys are missing return 503. Web: a 🔊 button on QuestCard that plays server audio; on any failure falls back to window.speechSynthesis. Never expose the key to the browser.

### STEP 15: Polish

Friendly error states for every API call, empty states, disabled buttons while loading, accessible labels, PWA basics (manifest.webmanifest with name, theme color, simple SVG icon; no service worker needed), meta viewport and theme-color. Remove the debug weather route. Run a full typecheck/build for both workspaces.

### STEP 16: Render deployment

Add render.yaml (Blueprint) with: a web service for the server (build: npm install && npm run build -w server; start: npm run start -w server; env vars listed without values) and a static site for the web (build: npm install && npm run build -w web; publish dir web/dist; VITE_API_URL pointing to the server URL). Update CORS_ORIGIN docs. In README, explain that Ollama is NOT on Render: deployed demo runs in fallback mode (preset quests + honor verification) with an "Offline AI mode" banner, and the full Gemma experience runs locally. Add `/api/health` as the health check path.

### STEP 17: README + launch kit

Write a README: pitch, GIF/screenshot placeholders, features, architecture diagram (ASCII), tech stack, setup (Node, Ollama, `ollama pull gemma3:4b`, Atlas, env vars), run commands, how AI offline fallback works, privacy notes (photos never stored), "Why open-weight matters", contributing (Hacktoberfest welcome, 3 good-first-issue ideas), license. Also create docs/DEV_POST_OUTLINE.md following the dev.to template headings: What I Built, Demo, Code, How I Built It, Why Open Innovation Matters, Prize Categories (Gemma, MongoDB Atlas, Render, ElevenLabs).
