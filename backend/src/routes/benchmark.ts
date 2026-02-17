import { Router, Request, Response } from "express";
import { BenchmarkRequestSchema } from "../types";
import { getPlaybook, listPlaybooks } from "../services/playbooks";
import { buildBenchmarkPrompt } from "../services/promptEngine";
import { callLLM, validateBenchmarkOutput } from "../services/llm";

const router = Router();

/**
 * GET /api/playbooks
 * Returns available playbooks the lawyer can benchmark against.
 * In production: fetched from Firestore, scoped to the user's organization.
 */
router.get("/playbooks", (_req: Request, res: Response) => {
  res.json(listPlaybooks());
});

/**
 * POST /api/benchmark
 * The core Benchmark feature endpoint.
 *
 * Flow (mirrors production CASUS):
 * 1. Validate request (Zod)
 * 2. Fetch the selected playbook
 * 3. Build the prompt (Prompt Engine)
 * 4. Call the LLM (Azure OpenAI in prod, mock or OpenAI here)
 * 5. Validate the LLM output (Zod)
 * 6. Return structured, validated result
 *
 * In production, step 6 would also store results in Firestore.
 */
router.post("/benchmark", async (req: Request, res: Response) => {
  try {
    // Step 1: Validate input
    const input = BenchmarkRequestSchema.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({
        error: "Invalid request",
        details: input.error.issues,
      });
      return;
    }

    const { documentText, playbook: playbookId } = input.data;

    // Step 2: Fetch playbook
    const playbook = getPlaybook(playbookId);
    if (!playbook) {
      res.status(404).json({ error: `Playbook '${playbookId}' not found` });
      return;
    }

    console.log(
      `[Benchmark] Processing: ${documentText.length} chars against "${playbook.name}" (${playbook.clauses.length} clauses)`
    );

    // Step 3: Build prompt
    const prompt = buildBenchmarkPrompt(documentText, playbook);
    console.log(
      `[Benchmark] Prompt built: system=${prompt.systemPrompt.length} chars, user=${prompt.userPrompt.length} chars`
    );

    // Step 4: Call LLM
    const rawResponse = await callLLM(prompt);
    console.log(`[Benchmark] LLM responded: ${rawResponse.length} chars`);

    // Step 5: Validate output (with retry — if validation fails, re-call LLM with error feedback)
    const result = await validateBenchmarkOutput(rawResponse, async (errorFeedback) => {
      console.warn(`[Benchmark] Validation failed, retrying with feedback: ${errorFeedback}`);
      return callLLM({
        systemPrompt: prompt.systemPrompt,
        userPrompt: `${prompt.userPrompt}\n\nIMPORTANT CORRECTION: ${errorFeedback}`,
      });
    });
    console.log(
      `[Benchmark] Validated: ${result.alignmentScore}% alignment, ${result.deviations.length} deviations`
    );

    // Step 6: Return (in prod: also store in Firestore)
    res.json(result);
  } catch (err) {
    console.error("[Benchmark] Error:", err);
    res.status(500).json({
      error: "Benchmark failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
