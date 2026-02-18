import "dotenv/config";
import express from "express";
import cors from "cors";
import benchmarkRouter from "./routes/benchmark";
import reviewRouter from "./routes/review";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "5mb" })); // contracts can be large

// Mount feature routes — each feature is a separate router, same infrastructure
app.use("/api", benchmarkRouter);
app.use("/api", reviewRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mock: !process.env.OPENAI_API_KEY });
});

app.listen(PORT, () => {
  console.log(`\n🏛️  CASUS Backend running on http://localhost:${PORT}`);
  console.log(
    `   Mode: ${process.env.OPENAI_API_KEY ? "REAL (OpenAI)" : "MOCK (no API key)"}`
  );
  console.log(`   Endpoints:`);
  console.log(`     GET  /api/health`);
  console.log(`     GET  /api/playbooks`);
  console.log(`     POST /api/benchmark`);
  console.log(`     POST /api/review`);
  console.log("");
});
