/**
 * CASUS Word Add-in Taskpane — Example Implementation
 *
 * This file shows how the CASUS Word Add-in taskpane works.
 * It's a React component that:
 * 1. Reads the document text from Word via Office.js
 * 2. Sends it to the CASUS backend for Benchmark analysis
 * 3. Displays results in the sidebar
 * 4. Applies fixes directly into Word with Track Changes
 *
 * NOTE: This won't run standalone — it needs the Office.js runtime
 * (i.e., it must be loaded inside Word). This is for reference only.
 */

import { useState } from "react";

// ──────────────────────────────────────────
// Office.js Helper Functions
// ──────────────────────────────────────────

/**
 * Read the full document text from the currently open Word document.
 * This replaces "file upload" — in the taskpane, we read directly from Word.
 */
async function readDocumentText(): Promise<string> {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text;
  });
}

/**
 * Read document with structure (paragraphs with their styles).
 * Useful for Proofread feature — needs to understand headings, numbering, etc.
 */
async function readDocumentStructured(): Promise<
  Array<{ text: string; style: string }>
> {
  return Word.run(async (context) => {
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load(["text", "style"]);
    await context.sync();

    return paragraphs.items.map((p) => ({
      text: p.text,
      style: p.style,
    }));
  });
}

/**
 * Search for text in the document and select it (scroll to it).
 * Used when the lawyer clicks a deviation in the results panel.
 */
async function navigateToText(searchText: string): Promise<boolean> {
  return Word.run(async (context) => {
    const results = context.document.body.search(searchText, {
      matchCase: false,
      matchWholeWord: false,
    });

    results.load("items");
    await context.sync();

    if (results.items.length > 0) {
      results.items[0].select();
      await context.sync();
      return true;
    }
    return false;
  });
}

/**
 * Apply a fix — replace text in the document.
 * If Track Changes is enabled (it usually is for lawyers), this
 * automatically creates a redline: old text = strikethrough, new text = insertion.
 */
async function applyFix(
  originalText: string,
  replacementText: string
): Promise<boolean> {
  return Word.run(async (context) => {
    const results = context.document.body.search(originalText, {
      matchCase: false,
    });

    results.load("items");
    await context.sync();

    if (results.items.length > 0) {
      results.items[0].insertText(
        replacementText,
        Word.InsertLocation.replace
      );
      await context.sync();
      return true;
    }
    return false;
  });
}

/**
 * Insert a completely new clause at the end of the document.
 * Used when Benchmark finds a "missing" clause.
 */
async function insertMissingClause(clauseText: string): Promise<void> {
  return Word.run(async (context) => {
    const body = context.document.body;

    // Insert paragraph break + the new clause at the end
    body.insertParagraph(clauseText, Word.InsertLocation.end);

    await context.sync();
  });
}

/**
 * Highlight a range of text with a content control.
 * Used to visually mark flagged clauses in the document.
 */
async function highlightClause(
  searchText: string,
  label: string,
  color: string = "#FFF3CD"
): Promise<void> {
  return Word.run(async (context) => {
    const results = context.document.body.search(searchText, {
      matchCase: false,
    });

    results.load("items");
    await context.sync();

    if (results.items.length > 0) {
      const range = results.items[0];

      // Add a content control (named wrapper)
      const cc = range.insertContentControl();
      cc.title = label;
      cc.tag = "casus-benchmark";
      cc.appearance = Word.ContentControlAppearance.boundingBox;

      // Highlight the text
      range.font.highlightColor = color;

      await context.sync();
    }
  });
}

// ──────────────────────────────────────────
// React Taskpane Component
// ──────────────────────────────────────────

interface Deviation {
  clauseTitle: string;
  documentExcerpt: string;
  deviationType: string;
  severity: string;
  explanation: string;
  suggestedFix?: string;
  locationHint: string;
}

interface BenchmarkResult {
  alignmentScore: number;
  deviations: Deviation[];
  summary: string;
}

export default function BenchmarkTaskpane() {
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRunBenchmark = async () => {
    setLoading(true);

    try {
      // Step 1: Read text from Word (NOT from a file upload!)
      const documentText = await readDocumentText();

      // Step 2: Call CASUS backend API (same API as web app)
      const response = await fetch("https://api.getcasus.com/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText,
          playbook: "nda-standard",
        }),
      });

      const data = await response.json();
      setResult(data);

      // Step 3: Highlight flagged clauses in the document
      for (const dev of data.deviations) {
        if (dev.locationHint && dev.locationHint !== "Not found in document") {
          const color =
            dev.severity === "critical"
              ? "#FECACA"
              : dev.severity === "major"
                ? "#FED7AA"
                : "#FEF9C3";
          await highlightClause(dev.locationHint, dev.clauseTitle, color);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = async (locationHint: string) => {
    await navigateToText(locationHint);
  };

  const handleApplyFix = async (deviation: Deviation) => {
    if (!deviation.suggestedFix) return;

    if (deviation.deviationType === "missing") {
      // Insert new clause at the end
      await insertMissingClause(deviation.suggestedFix);
    } else {
      // Replace existing text
      await applyFix(deviation.documentExcerpt, deviation.suggestedFix);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h3>CASUS Benchmark</h3>

      <button onClick={handleRunBenchmark} disabled={loading}>
        {loading ? "Analyzing..." : "Run Benchmark"}
      </button>

      {result && (
        <div>
          <p>Alignment: {result.alignmentScore}%</p>
          <p>{result.summary}</p>

          {result.deviations.map((dev, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <strong>{dev.clauseTitle}</strong>
              <span>
                {" "}
                — {dev.severity} / {dev.deviationType}
              </span>
              <p>{dev.explanation}</p>

              {/* Click to jump to that spot in the Word document */}
              {dev.locationHint !== "Not found in document" && (
                <button onClick={() => handleNavigate(dev.locationHint)}>
                  Go to clause
                </button>
              )}

              {/* Apply the fix directly in Word with Track Changes */}
              {dev.suggestedFix && (
                <button onClick={() => handleApplyFix(dev)}>
                  Insert Fix
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
