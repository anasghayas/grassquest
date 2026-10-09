// Entry point: starts the Express server on the configured PORT.

import { app } from "./app.js";
import { config } from "./config.js";

app.listen(config.port, () => {
  console.log(`🌿 GrassQuest server running on http://localhost:${config.port}`);
});
