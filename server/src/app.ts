import cors from "cors";
import express from "express";
import { env, hasConfiguredGeminiKey } from "./config/env";
import { errorHandler, notFound } from "./middleware/errorHandler";
import routes from "./routes";

const app = express();

app.set("etag", false);
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    aiConfigured: hasConfiguredGeminiKey(),
    time: new Date().toISOString(),
  });
});

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

export default app;
