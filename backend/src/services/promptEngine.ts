import { Playbook } from "../types";

/**
 * PROMPT ENGINE
 *
 * This is the core of how CASUS works. Each feature (Benchmark, Review,
 * Proofread, Chat, etc.) has its own prompt template. The prompt engine:
 *
 * 1. Takes the document text + feature-specific parameters
 * 2. Constructs a complete prompt with system instructions
 * 3. Returns { systemPrompt, userPrompt } ready for the LLM
 *
 * In production CASUS, this is where most of the "secret sauce" lives.
 * The prompt engineering determines the quality of every feature.
 */

export interface PromptPair {
  systemPrompt: string;
  userPrompt: string;
}

export function buildBenchmarkPrompt(
  documentText: string,
  playbook: Playbook
): PromptPair {
  const clauseList = playbook.clauses
    .map(
      (c, i) =>
        `### Standard Clause ${i + 1}: ${c.title} [importance: ${c.importance}]\n${c.standardText}`
    )
    .join("\n\n");

  const systemPrompt = `You are a legal contract analyst specializing in DACH (Germany, Austria, Switzerland) law.
Your task is to benchmark a contract against a defined standard (playbook).

INSTRUCTIONS:
1. Compare the document clause-by-clause against each standard clause below.
2. For each standard clause, determine if the document:
   - "ok" — matches the standard or is equivalent
   - "missing" — the clause is entirely absent from the document
   - "weaker" — present but offers less protection than the standard
   - "stronger" — present but more restrictive than the standard
   - "different" — present but takes a materially different approach
3. Assign severity: "critical", "major", "minor", or "info"
4. Provide a brief explanation of the deviation
5. Suggest a fix when the deviation is "missing", "weaker", or "different"
6. Include a locationHint — quote 5-10 words from the document where the clause appears (or "Not found in document" if missing)

STANDARD PLAYBOOK: "${playbook.name}"
${clauseList}

OUTPUT FORMAT (strict JSON):
{
  "alignmentScore": <number 0-100>,
  "totalClauses": ${playbook.clauses.length},
  "playbook": "${playbook.name}",
  "summary": "<2-3 sentence overall assessment>",
  "deviations": [
    {
      "clauseTitle": "<title from standard>",
      "documentExcerpt": "<relevant text from the document, or 'N/A'>",
      "standardExcerpt": "<text from the standard>",
      "deviationType": "<missing|weaker|stronger|different|ok>",
      "severity": "<critical|major|minor|info>",
      "explanation": "<why this matters>",
      "suggestedFix": "<suggested replacement text or null>",
      "locationHint": "<5-10 word quote from document>"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation outside the JSON.`;

  const userPrompt = `Analyze the following contract against the "${playbook.name}" standard:\n\n---\nDOCUMENT:\n${documentText}\n---`;

  return { systemPrompt, userPrompt };
}

/**
 * REVIEW PROMPT
 *
 * Unlike Benchmark, Review doesn't compare against a playbook.
 * It performs general risk analysis: what's dangerous, weak, missing, or unusual
 * in this contract — regardless of any standard.
 */
export function buildReviewPrompt(
  documentText: string,
  jurisdiction?: string
): PromptPair {
  const jurisdictionNote = jurisdiction
    ? `Pay special attention to risks under ${jurisdiction} law.`
    : `Identify the jurisdiction from the document if possible. If not specified, analyze under general DACH (Germany, Austria, Switzerland) law principles.`;

  const systemPrompt = `You are a senior legal risk analyst specializing in contract review for DACH (Germany, Austria, Switzerland) jurisdictions.
Your task is to perform a comprehensive risk analysis of a contract document.

INSTRUCTIONS:
1. Read the entire document carefully.
2. First, identify what type of contract this is (NDA, service agreement, employment contract, license agreement, etc.).
3. Identify ALL legal risks, red flags, weaknesses, and problematic clauses.
4. For each finding, classify the risk category:
   - "liability" — unlimited liability, missing caps, one-sided indemnification
   - "termination" — lock-in periods, missing termination rights, automatic renewals
   - "intellectual_property" — unclear IP ownership, broad license grants, missing IP assignments
   - "confidentiality" — weak definitions, missing duration, no return/destruction obligation
   - "payment" — unclear payment terms, missing late payment penalties, no price adjustment
   - "data_protection" — missing DPA, GDPR gaps, unclear data processing purposes
   - "governing_law" — unfavorable jurisdiction, missing dispute resolution, unclear choice of law
   - "indemnification" — broad indemnity obligations, missing carve-outs
   - "non_compete" — overly broad restrictions, excessive duration
   - "general" — anything that doesn't fit the above categories
5. Assign severity: "critical" (deal-breaker risk), "major" (significant risk), "minor" (should be addressed), "info" (worth noting)
6. For each finding, explain WHY it's a risk in practical terms (not just "this is missing" — explain the consequence)
7. Suggest an alternative clause or fix when possible
8. Include a locationHint — quote 5-10 words from the document where the issue appears
9. ${jurisdictionNote}

PRIORITIZATION:
- Flag CRITICAL risks first: unlimited liability, missing termination rights, unclear IP ownership
- Then MAJOR: one-sided clauses, missing standard protections, vague definitions
- Then MINOR: stylistic issues, best-practice deviations, minor gaps

RISK SCORE:
Calculate a riskScore from 0-100 where:
- 0 = extremely risky (many critical issues, document is dangerous to sign)
- 50 = moderate risk (some issues that need attention)
- 100 = very safe (well-drafted, balanced, comprehensive)

OUTPUT FORMAT (strict JSON):
{
  "riskScore": <number 0-100>,
  "totalFindings": <number>,
  "documentType": "<what type of contract this is>",
  "summary": "<2-3 sentence overall risk assessment>",
  "findings": [
    {
      "title": "<short descriptive title of the risk>",
      "riskCategory": "<liability|termination|intellectual_property|confidentiality|payment|data_protection|governing_law|indemnification|non_compete|general>",
      "severity": "<critical|major|minor|info>",
      "documentExcerpt": "<relevant text from the document>",
      "explanation": "<why this is a risk and what could go wrong>",
      "suggestedAlternative": "<recommended clause language or fix>",
      "locationHint": "<5-10 word quote from document>"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation outside the JSON.`;

  const userPrompt = `Perform a comprehensive risk analysis of the following contract:\n\n---\nDOCUMENT:\n${documentText}\n---`;

  return { systemPrompt, userPrompt };
}


