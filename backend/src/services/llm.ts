import OpenAI from "openai";
import { PromptPair } from "./promptEngine";
import {
  BenchmarkResult,
  BenchmarkResultSchema,
  ReviewResult,
  ReviewResultSchema,
} from "../types";

/**
 * LLM SERVICE
 *
 * For this demo, we support two modes:
 * 1. MOCK — returns realistic fake data (no API key needed)
 * 2. REAL — calls OpenAI API (set OPENAI_API_KEY env var)
 */

const USE_MOCK = !process.env.OPENAI_API_KEY;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function callLLM(prompt: PromptPair): Promise<string> {
  if (USE_MOCK) {
    console.log("[LLM] Using MOCK mode (no OPENAI_API_KEY set)");
    const isReview = prompt.systemPrompt.includes("risk analysis");
    return isReview ? getMockReviewResponse() : getMockBenchmarkResponse(prompt);
  }
  // Calls the OpenAI API with retry logic and exponential backoff.
  // Sends the system and user prompts, expects a JSON response, and handles retryable errors (rate limiting, timeouts, internal server errors).
  // Retries up to MAX_RETRIES times, increasing the delay with each attempt.
  // Throws an error if all attempts fail or if the API returns an empty response.
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[LLM] Calling OpenAI API (attempt ${attempt}/${MAX_RETRIES})...`);

      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0, // deterministic for legal analysis
        messages: [
          { role: "system", content: prompt.systemPrompt },
          { role: "user", content: prompt.userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("LLM returned empty response");
      }

      return content;
    } catch (err) {
      const isRateLimit = err instanceof OpenAI.RateLimitError;
      const isTimeout = err instanceof OpenAI.APIConnectionTimeoutError;
      const isRetryable = isRateLimit || isTimeout || (err instanceof OpenAI.InternalServerError);

      if (isRetryable && attempt < MAX_RETRIES) {
        // If error is retryable, wait for an exponentially increasing delay, then retry
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // exponential backoff: 1s, 2s, 4s
        console.warn(`[LLM] ${isRateLimit ? "Rate limited" : "API error"} — retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // If not retryable or out of attempts, throw error with message
      throw new Error(
        `LLM API call failed after ${attempt} attempt(s): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  throw new Error("LLM call exhausted all retries");
}

/**
 * OUTPUT VALIDATOR
 *
 * This is CRITICAL in legal tech. You can never show unvalidated AI output
 * to a lawyer. The validator:
 * 1. Parses the raw LLM string as JSON
 * 2. Validates against the Zod schema
 * 3. If validation fails, retries the LLM call with error feedback
 * 4. Returns typed, safe data — or throws with clear errors
 */
/**
 * Validates and parses the raw output from the LLM for Benchmark tasks.
 *
 * This function serves as a robust validator for AI results in legal workflows:
 * - It attempts to parse the raw string output from the LLM (expected JSON).
 * - Then, it checks the parsed object against the BenchmarkResult Zod schema to ensure structure and types are as expected.
 * - If the JSON is invalid or doesn't match the schema, and a retry function is provided, it attempts a single retry with error feedback.
 * - Throws explicit errors if both parsing and validation fail after the allowed attempts.
 * - Returns a strongly-typed, safe BenchmarkResult object upon success.
 *
 * @param raw       The raw string output from the LLM.
 * @param retryFn   (Optional) A callback to retry the LLM call with error feedback, used if initial validation fails.
 * @returns         A validated BenchmarkResult object.
 * @throws          If output cannot be parsed or validated after retries.
 */
export async function validateBenchmarkOutput(
  raw: string,
  retryFn?: (errorFeedback: string) => Promise<string>
): Promise<BenchmarkResult> {
  let currentRaw = raw;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(currentRaw);
    } catch {
      if (attempt === 1 && retryFn) {
        console.warn("[Validator] Invalid JSON from LLM — retrying with error feedback...");
        currentRaw = await retryFn(
          `Your previous response was not valid JSON. Return ONLY valid JSON matching the schema. Error: invalid JSON syntax.`
        );
        continue;
      }
      throw new Error(`LLM returned invalid JSON: ${currentRaw.substring(0, 200)}...`);
    }

    const result = BenchmarkResultSchema.safeParse(parsed);

    if (!result.success) {
      const errors = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");

      if (attempt === 1 && retryFn) {
        console.warn(`[Validator] Schema validation failed — retrying with error feedback: ${errors}`);
        currentRaw = await retryFn(
          `Your previous response had validation errors: ${errors}. Fix these issues and return valid JSON matching the required schema.`
        );
        continue;
      }
      throw new Error(`LLM output failed validation: ${errors}`);
    }

    return result.data;
  }

  throw new Error("Validation exhausted all retries");
}

/**
 * OUTPUT VALIDATOR — REVIEW
 *
 * Same pattern as Benchmark validation: parse JSON, validate Zod schema,
 * retry with error feedback if needed. Different schema, same infrastructure.
 */
/**
 * Validates and parses the raw output from the LLM for Review tasks.
 *
 * This function serves as a robust validator for AI results in legal workflows:
 * - It attempts to parse the raw string output from the LLM (expected JSON).
 * - Then, it checks the parsed object against the ReviewResult Zod schema to ensure structure and types are as expected.
 * - If the JSON is invalid or doesn't match the schema, and a retry function is provided, it attempts a single retry with error feedback.
 * - Throws explicit errors if both parsing and validation fail after the allowed attempts.
 * - Returns a strongly-typed, safe ReviewResult object upon success.
 *
 * @param raw       The raw string output from the LLM.
 * @param retryFn   (Optional) A callback to retry the LLM call with error feedback, used if initial validation fails.
 * @returns         A validated ReviewResult object.
 * @throws          If output cannot be parsed or validated after retries.
 */
export async function validateReviewOutput(
  raw: string,
  retryFn?: (errorFeedback: string) => Promise<string>
): Promise<ReviewResult> {
  let currentRaw = raw;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(currentRaw);
    } catch {
      if (attempt === 1 && retryFn) {
        console.warn("[Validator] Invalid JSON from LLM (review) — retrying with error feedback...");
        currentRaw = await retryFn(
          `Your previous response was not valid JSON. Return ONLY valid JSON matching the schema. Error: invalid JSON syntax.`
        );
        continue;
      }
      throw new Error(`LLM returned invalid JSON: ${currentRaw.substring(0, 200)}...`);
    }

    const result = ReviewResultSchema.safeParse(parsed);

    if (!result.success) {
      const errors = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");

      if (attempt === 1 && retryFn) {
        console.warn(`[Validator] Review schema validation failed — retrying: ${errors}`);
        currentRaw = await retryFn(
          `Your previous response had validation errors: ${errors}. Fix these issues and return valid JSON matching the required schema.`
        );
        continue;
      }
      throw new Error(`LLM output failed validation: ${errors}`);
    }

    return result.data;
  }

  throw new Error("Review validation exhausted all retries");
}

/**
 * Generates a mock response for Benchmark tasks.
 *
 * This function simulates a realistic LLM response for development purposes:
 * - It uses a hardcoded response based on the prompt to provide a consistent output.
 * - The response includes a variety of deviations (missing, weaker, stronger, different) to test the validator.
 * - The response is returned as a JSON string.
 *
 * @param prompt    The prompt pair used to generate the response.
 * @returns         A JSON string representing the mock response.
 */
function getMockBenchmarkResponse(prompt: PromptPair): string {
  // Simulate ~1s LLM latency
  const isNDA = prompt.userPrompt.toLowerCase().includes("nda") ||
    prompt.systemPrompt.toLowerCase().includes("nda");

  const result: BenchmarkResult = {
    alignmentScore: 62,
    totalClauses: 8,
    playbook: isNDA ? "NDA Standard" : "Service Agreement (MSA)",
    summary:
      "The document covers core confidentiality obligations but is missing several standard protective clauses. The definition of confidential information is narrower than the standard, and there is no non-solicitation provision. Governing law clause is present but specifies a different jurisdiction.",
    deviations: [
      {
        clauseTitle: "Definition of Confidential Information",
        documentExcerpt:
          "Confidential Information shall mean any proprietary data shared between the parties.",
        standardExcerpt:
          "Confidential Information means any and all non-public information, whether written, oral, electronic, or visual...",
        deviationType: "weaker",
        severity: "critical",
        explanation:
          "The document uses a narrow definition ('proprietary data') that doesn't explicitly cover oral disclosures, visual information, or specific categories like trade secrets and customer lists. This could leave gaps in protection.",
        suggestedFix:
          'Replace with: "Confidential Information means any and all non-public information, whether written, oral, electronic, or visual, disclosed by either Party to the other Party, including but not limited to trade secrets, business plans, financial data, customer lists, technical specifications, and proprietary software."',
        locationHint: "Confidential Information shall mean any proprietary",
      },
      {
        clauseTitle: "Obligations of Receiving Party",
        documentExcerpt:
          "The receiving party agrees to keep all shared information confidential and not share it with others.",
        standardExcerpt:
          "The Receiving Party shall: (a) hold Confidential Information in strict confidence; (b) not disclose it to any third party...",
        deviationType: "weaker",
        severity: "major",
        explanation:
          "The document's obligation clause is vague ('keep confidential and not share') without specifying the standard of care, permitted uses, or the requirement to use at least the same degree of care as for own confidential information.",
        suggestedFix:
          "Add specific sub-obligations: (a) strict confidence, (b) no third-party disclosure without written consent, (c) use solely for the Purpose, (d) protect with at least the same degree of care as own confidential information.",
        locationHint: "agrees to keep all shared information confidential",
      },
      {
        clauseTitle: "Term and Duration",
        documentExcerpt:
          "This agreement is valid for one (1) year from the date of signing.",
        standardExcerpt:
          "This Agreement shall remain in effect for a period of two (2) years... confidentiality obligations shall survive termination for an additional period of three (3) years.",
        deviationType: "weaker",
        severity: "major",
        explanation:
          "The term is only 1 year (standard is 2 years) and there is no survival clause. Confidentiality obligations should survive termination — without this, information can be freely used after the agreement ends.",
        suggestedFix:
          'Replace with: "This Agreement shall remain in effect for a period of two (2) years from the Effective Date. The confidentiality obligations shall survive termination for an additional period of three (3) years."',
        locationHint: "valid for one (1) year from the date",
      },
      {
        clauseTitle: "Permitted Disclosures",
        documentExcerpt: "N/A",
        standardExcerpt:
          "The Receiving Party may disclose Confidential Information to its employees, agents, or advisors who have a need to know...",
        deviationType: "missing",
        severity: "major",
        explanation:
          "No permitted disclosure clause found. Without this, the agreement implies zero disclosure is allowed — which is impractical. Employees and advisors often need access. The standard clause permits this while maintaining protection.",
        suggestedFix:
          'Add: "The Receiving Party may disclose Confidential Information to its employees, agents, or advisors who have a need to know, provided they are bound by confidentiality obligations no less restrictive than those in this Agreement."',
        locationHint: "Not found in document",
      },
      {
        clauseTitle: "Return or Destruction",
        documentExcerpt: "N/A",
        standardExcerpt:
          "Upon termination or upon request, the Receiving Party shall promptly return or destroy all Confidential Information...",
        deviationType: "missing",
        severity: "minor",
        explanation:
          "No return/destruction clause. Upon termination, there's no obligation to return or destroy confidential materials. This is a standard protective measure.",
        suggestedFix:
          'Add: "Upon termination or upon request, the Receiving Party shall promptly return or destroy all Confidential Information and certify in writing that it has done so."',
        locationHint: "Not found in document",
      },
      {
        clauseTitle: "Remedies",
        documentExcerpt: "N/A",
        standardExcerpt:
          "The Parties acknowledge that breach may cause irreparable harm. The Disclosing Party shall be entitled to seek injunctive relief...",
        deviationType: "missing",
        severity: "major",
        explanation:
          "No remedies clause. Without acknowledging irreparable harm and the right to injunctive relief, enforcement becomes slower and harder in court.",
        suggestedFix:
          'Add: "The Parties acknowledge that breach of this Agreement may cause irreparable harm. The Disclosing Party shall be entitled to seek injunctive relief in addition to any other remedies available at law or in equity."',
        locationHint: "Not found in document",
      },
      {
        clauseTitle: "Governing Law",
        documentExcerpt:
          "This agreement shall be governed by the laws of Germany. Disputes shall be resolved in the courts of Munich.",
        standardExcerpt:
          "This Agreement shall be governed by and construed in accordance with the laws of Switzerland. Any disputes shall be submitted to the exclusive jurisdiction of the courts of Zurich.",
        deviationType: "different",
        severity: "minor",
        explanation:
          "The document specifies German law / Munich courts instead of Swiss law / Zurich courts. This is a jurisdictional difference — not necessarily wrong, but deviates from the firm's standard. May need discussion depending on the parties.",
        locationHint: "governed by the laws of Germany",
      },
      {
        clauseTitle: "Non-Compete / Non-Solicitation",
        documentExcerpt: "N/A",
        standardExcerpt:
          "During the term and for twelve (12) months thereafter, neither Party shall solicit or hire employees of the other Party...",
        deviationType: "missing",
        severity: "major",
        explanation:
          "No non-solicitation clause. This leaves the parties free to recruit each other's employees who gained access to confidential information during the collaboration.",
        suggestedFix:
          'Add: "During the term and for twelve (12) months thereafter, neither Party shall solicit or hire employees of the other Party who were involved in the exchange of Confidential Information."',
        locationHint: "Not found in document",
      },
    ],
  };

  return JSON.stringify(result);
}

/**
 * Generates a mock response for Review tasks.
 *
 * This function simulates a realistic LLM response for development purposes:
 * - It uses a hardcoded response based on the prompt to provide a consistent output.
 * - The response includes a variety of findings (risk categories, severities, explanations, suggested alternatives) to test the validator.
 * - The response is returned as a JSON string.
 *
 * @returns         A JSON string representing the mock response.
 */
export function getMockReviewResponse(): string {
  const result: ReviewResult = {
    riskScore: 35,
    totalFindings: 6,
    documentType: "Mutual Non-Disclosure Agreement",
    summary:
      "This NDA presents significant risks due to vague obligation language, a narrow confidentiality definition, and missing standard protective clauses. The agreement lacks limitation of liability, permitted disclosures, and return/destruction provisions that are expected in professional NDAs.",
    findings: [
      {
        title: "Vague Confidentiality Obligations",
        riskCategory: "confidentiality",
        severity: "critical",
        documentExcerpt:
          "The receiving party agrees to keep all shared information confidential and not share it with others.",
        explanation:
          "The obligation clause is dangerously vague. 'Keep confidential and not share with others' does not specify the standard of care, permitted uses, or exceptions. In a dispute, a court may interpret this loosely. Without a defined standard of care (e.g., 'same degree of care as own confidential information'), the receiving party could argue minimal efforts were sufficient.",
        suggestedAlternative:
          "The Receiving Party shall: (a) hold Confidential Information in strict confidence; (b) not disclose to any third party without prior written consent; (c) use it solely for evaluating the potential business relationship; (d) protect it with at least the same degree of care as it uses for its own confidential information, but no less than reasonable care.",
        locationHint: "agrees to keep all shared information confidential",
      },
      {
        title: "Narrow Definition of Confidential Information",
        riskCategory: "confidentiality",
        severity: "major",
        documentExcerpt:
          "Confidential Information shall mean any proprietary data shared between the parties.",
        explanation:
          "The term 'proprietary data' is too narrow and ambiguous. It may not cover oral disclosures, visual demonstrations, trade secrets disclosed verbally, or information that is not technically 'data' (e.g., business strategies, customer relationships). This creates gaps in what is actually protected.",
        suggestedAlternative:
          '"Confidential Information" means any and all non-public information, whether written, oral, electronic, or visual, disclosed by either Party, including but not limited to trade secrets, business plans, financial data, customer lists, technical specifications, and proprietary software.',
        locationHint: "Confidential Information shall mean any proprietary",
      },
      {
        title: "No Limitation of Liability",
        riskCategory: "liability",
        severity: "major",
        documentExcerpt: "N/A",
        explanation:
          "The agreement contains no limitation of liability clause. In the event of a breach, the disclosing party could claim unlimited damages including consequential and indirect losses. This creates unbounded financial exposure for both parties.",
        suggestedAlternative:
          "Neither Party's aggregate liability under this Agreement shall exceed the direct damages actually incurred, and in no event shall either Party be liable for indirect, incidental, special, or consequential damages.",
        locationHint: "Not found in document",
      },
      {
        title: "Short Term Without Survival Clause",
        riskCategory: "termination",
        severity: "major",
        documentExcerpt:
          "This agreement is valid for one (1) year from the date of signing.",
        explanation:
          "A 1-year term is short for an NDA, and critically, there is no survival clause. When the agreement expires, the confidentiality obligations end immediately — meaning all disclosed information can be freely used the next day. This defeats the purpose of the NDA for any information with lasting value.",
        suggestedAlternative:
          "This Agreement shall remain in effect for two (2) years from the Effective Date. The confidentiality obligations shall survive termination or expiration for an additional period of three (3) years.",
        locationHint: "valid for one (1) year from the date",
      },
      {
        title: "Missing Permitted Disclosure Exceptions",
        riskCategory: "confidentiality",
        severity: "major",
        documentExcerpt: "N/A",
        explanation:
          "The agreement has no exceptions for permitted disclosures. In practice, employees, legal advisors, and auditors often need access to confidential information. Without a permitted disclosure clause, any sharing — even with your own lawyer — technically breaches the agreement.",
        suggestedAlternative:
          "The Receiving Party may disclose Confidential Information to its employees, agents, or professional advisors who have a need to know, provided they are bound by confidentiality obligations no less restrictive than those herein.",
        locationHint: "Not found in document",
      },
      {
        title: "Foreign Jurisdiction for Swiss Party",
        riskCategory: "governing_law",
        severity: "minor",
        documentExcerpt:
          "This agreement shall be governed by the laws of Germany. Disputes shall be resolved in the courts of Munich.",
        explanation:
          "The agreement involves a Swiss party (InnoVentures AG, Zurich) but is governed by German law with Munich courts. This means the Swiss party would need to litigate in a foreign jurisdiction, increasing costs and complexity. This may be acceptable but should be a conscious decision.",
        locationHint: "governed by the laws of Germany",
      },
    ],
  };

  return JSON.stringify(result);
}
