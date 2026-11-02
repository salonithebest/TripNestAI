import { setServers } from "node:dns";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

if (env.DNS_SERVER) {
  setServers([env.DNS_SERVER]);
}

async function start(): Promise<void> {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`API running at http://localhost:${env.PORT}`);
  });
}

start().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
