import OpenAI from "openai";
import { PromptPair } from "./promptEngine";
import { BenchmarkResult, BenchmarkResultSchema } from "../types";

/**
 * LLM SERVICE
 *
 * In production CASUS, this calls Azure OpenAI (NOT regular OpenAI).
 * Why Azure? Because Azure lets you:
 * - Host in EU region (data residency for Swiss law firms)
 * - Disable abuse monitoring (attorney-client privilege)
 * - Enable zero data retention (content not stored by Microsoft)
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
    return getMockBenchmarkResponse(prompt);
  }

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
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // exponential backoff: 1s, 2s, 4s
        console.warn(`[LLM] ${isRateLimit ? "Rate limited" : "API error"} — retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

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
