// Entry point: connects to MongoDB then starts the Express server.

import { app } from "./app.js";
import { config } from "./config.js";
import { connectDb } from "./db.js";

// Connect to the database first, then start listening
await connectDb();

app.listen(config.port, () => {
  console.log(`🌿 GrassQuest server running on http://localhost:${config.port}`);
});
