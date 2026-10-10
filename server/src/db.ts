// Connects to MongoDB using mongoose. Call connectDb() at startup.

import mongoose from "mongoose";
import { requireMongoUri } from "./config.js";

// Connects to MongoDB Atlas using the URI from env vars
export async function connectDb(): Promise<void> {
  const uri = requireMongoUri();

  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", (err as Error).message);
    process.exit(1);
  }
}

// Returns the current mongoose connection state as a simple string
export function getDbStatus(): "connected" | "disconnected" {
  // mongoose.connection.readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
}
