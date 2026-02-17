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
