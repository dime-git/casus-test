import { Router, Request, Response } from "express";
import { ReviewRequestSchema } from "../types";
import { buildReviewPrompt } from "../services/promptEngine";
import { callLLM, validateReviewOutput, getMockReviewResponse } from "../services/llm";

const router = Router();

/**
 * POST /api/review
 *
 * General risk analysis — no playbook needed.
 * Identifies risks, red flags, and weaknesses in any contract.
 *
 * Flow (same infrastructure as Benchmark, different prompt + schema):
 * 1. Validate request (Zod)
 * 2. Build the review prompt (Prompt Engine)
 * 3. Call the LLM
 * 4. Validate the LLM output (Zod — ReviewResultSchema)
 * 5. Return structured, validated result
 */
router.post("/review", async (req: Request, res: Response) => {
  try {
    // Step 1: Validate input
    const input = ReviewRequestSchema.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({
        error: "Invalid request",
        details: input.error.issues,
      });
      return;
    }

    const { documentText, jurisdiction } = input.data;

    console.log(
      `[Review] Processing: ${documentText.length} chars${jurisdiction ? ` (jurisdiction: ${jurisdiction})` : ""}`
    );

    // Step 2: Build prompt
    const prompt = buildReviewPrompt(documentText, jurisdiction);
    console.log(
      `[Review] Prompt built: system=${prompt.systemPrompt.length} chars, user=${prompt.userPrompt.length} chars`
    );

    // Step 3: Call LLM (or mock)
    const rawResponse = await callLLM(prompt);
    console.log(`[Review] LLM responded: ${rawResponse.length} chars`);

    // Step 4: Validate output (with retry — if validation fails, re-call LLM with error feedback)
    const result = await validateReviewOutput(rawResponse, async (errorFeedback) => {
      console.warn(`[Review] Validation failed, retrying with feedback: ${errorFeedback}`);
      return callLLM({
        systemPrompt: prompt.systemPrompt,
        userPrompt: `${prompt.userPrompt}\n\nIMPORTANT CORRECTION: ${errorFeedback}`,
      });
    });
    console.log(
      `[Review] Validated: ${result.riskScore}/100 risk score, ${result.totalFindings} findings`
    );

    // Step 5: Return
    res.json(result);
  } catch (err) {
    console.error("[Review] Error:", err);
    res.status(500).json({
      error: "Review failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
