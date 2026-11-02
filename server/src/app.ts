import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/errorHandler";
import routes from "./routes";

const app = express();

app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

export default app;
