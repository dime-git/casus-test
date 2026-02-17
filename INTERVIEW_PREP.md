# What to Expect from Manuel — Coding Exercise Prep

## Interview Structure (from Celeste)
- **30-45 min**: Questions & discussion with Manuel
- **60+ min**: Live coding exercise, coding together in real-time
- Celeste said: "Nothing crazy. We really just want to see how you approach problems."

## What Manuel Will Likely Test

### 1. "Build a Feature Endpoint" (MOST LIKELY — 80% chance)

Manuel gives you a feature requirement and watches you build the backend endpoint.

**Example prompt**: "We need a Proofread endpoint. Given document text, find inconsistencies 
in definitions, broken cross-references, and numbering errors. Return structured results."

**What they're looking for**:
- Can you define a clear TypeScript interface / Zod schema for the output?
- Can you write a good system prompt that gets reliable results?
- Do you validate the LLM output before returning it?
- Do you handle errors gracefully?

**Pattern** (same as what we built):
```typescript
// 1. Define the output schema with Zod
const ProofreadResultSchema = z.object({
  issues: z.array(z.object({
    type: z.enum(["definition_inconsistency", "broken_reference", "numbering_error", "contradiction"]),
    location: z.string(),
    explanation: z.string(),
    suggestedFix: z.string(),
    severity: z.enum(["critical", "major", "minor"]),
  })),
  summary: z.string(),
});

// 2. Build the prompt
const systemPrompt = `You are a legal proofreader...
Check for:
- Definition inconsistencies (term defined one way, used differently elsewhere)
- Broken cross-references (Section X.Y doesn't exist)
- Numbering errors (skipped numbers, duplicates)
- Contradictions (two clauses that conflict)
Return JSON...`;

// 3. Call LLM, validate, return
const raw = await callLLM({ systemPrompt, userPrompt: documentText });
const result = ProofreadResultSchema.parse(JSON.parse(raw));
res.json(result);
```

---

### 2. "Add Streaming to the Chat Feature" (40% chance)

They might ask you to implement streaming responses for AI Chat,
so the lawyer sees text appear in real-time instead of waiting.

**What they're looking for**:
- Do you know Server-Sent Events (SSE) or WebSockets?
- Can you stream from Azure OpenAI through your Node server to the React frontend?

**Pattern**:
```typescript
// Backend: Stream from OpenAI
app.post("/api/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [...],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: [DONE]\n\n`);
  res.end();
});

// Frontend: Consume the stream
const response = await fetch("/api/chat/stream", { method: "POST", body: ... });
const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // Parse SSE events and update React state
}
```

---

### 3. "Build a React Component for Feature Results" (50% chance)

Manuel shows you a mockup or describes a UI, asks you to build the component.

**What they're looking for**:
- Clean React + TypeScript component structure
- Proper typing of props
- State management (useState, maybe useReducer)
- Calling the backend API and handling loading/error states

**Example**: "Build a Review results panel that shows flagged risks, lets the user
click to navigate to that clause, and shows a severity breakdown."

You already built this in `BenchmarkResults.tsx` — the exact same pattern applies.

---

### 4. "How Would You Implement Multi-Document RAG?" (30% chance — discussion)

Not coding, but a design/architecture discussion about their roadmap.

**Smart answer**:
```
1. When a firm uploads documents → parse text → generate embeddings (OpenAI embeddings API)
2. Store embeddings in a vector database (Pinecone, Weaviate, or pgvector)
3. When benchmarking/reviewing a new document:
   a. Embed the query/clause
   b. Retrieve top-K similar clauses from the firm's document history
   c. Include retrieved context in the LLM prompt alongside the current document
4. This enables: "How did we handle this clause in similar deals?"
```

---

### 5. "Fix This Bug / Refactor This Code" (30% chance)

Manuel shows you existing code (probably from their codebase) and asks you to:
- Find and fix a bug
- Refactor for better error handling
- Add TypeScript types to untyped code
- Improve a prompt that's getting inconsistent results

**Tips**: Ask clarifying questions. "What's the expected behavior?" "What's the actual output?"

---

## Discussion Questions Manuel Might Ask

### Technical
- "How would you handle rate limiting from Azure OpenAI?" 
  → Exponential backoff, request queue, fallback models

- "How do we ensure the LLM output is always valid JSON?"
  → `response_format: { type: "json_object" }`, Zod validation, retry on failure

- "How would you test the prompt engine?"
  → Golden test sets with expected outputs, automated regression testing,
    eval metrics (precision/recall on clause detection)

- "How would you handle a 200-page document that exceeds the token limit?"
  → Chunk the document intelligently (by section/heading), process chunks
    independently, merge results, or use a map-reduce pattern

### Product / Process
- "How do you decide which LLM to use for which feature?"
  → Cost vs quality tradeoff. Research (lower stakes) → cheaper/faster model.
    Benchmark (high stakes, needs precision) → GPT-4 with temperature=0.

- "How do you approach a feature from zero?"
  → Understand the user's workflow first, define input/output schemas,
    iterate on prompts with real documents, validate with lawyers.

## Key Things to Demonstrate

1. **Think out loud** — they want to see your problem-solving process
2. **Ask clarifying questions** — "Should this handle PDFs too, or just text?"
3. **Start with the types/schema** — define what the output looks like FIRST
4. **Validate everything** — show you understand legal tech = no unvalidated AI output
5. **Mention data residency** — show you understand the Swiss/EU constraint
6. **Reference their stack** — "I'd use Zod for this since you're already on TypeScript"
