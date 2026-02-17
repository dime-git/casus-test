import express from "express";
import cors from "cors";
import benchmarkRouter from "./routes/benchmark";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "5mb" })); // contracts can be large

// Mount feature routes
app.use("/api", benchmarkRouter);

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
  console.log("");
});
