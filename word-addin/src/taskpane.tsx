import { useState, useEffect } from "react";

/* global Word, Office */

const API_BASE = "http://localhost:3001/api";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface Deviation {
  clauseTitle: string;
  documentExcerpt: string;
  deviationType: "missing" | "weaker" | "stronger" | "different" | "ok";
  severity: "critical" | "major" | "minor" | "info";
  explanation: string;
  suggestedFix?: string;
  locationHint: string;
}

interface BenchmarkResult {
  alignmentScore: number;
  totalClauses: number;
  deviations: Deviation[];
  summary: string;
  playbook: string;
}

interface PlaybookSummary {
  id: string;
  name: string;
  description: string;
  clauseCount: number;
}

// ──────────────────────────────────────────
// Office.js Helper Functions
// ──────────────────────────────────────────

async function readDocumentText(): Promise<string> {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text;
  });
}

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

async function insertMissingClause(clauseText: string): Promise<void> {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.insertParagraph(clauseText, Word.InsertLocation.end);
    await context.sync();
  });
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "#FECACA";
    case "major":
      return "#FED7AA";
    case "minor":
      return "#FEF9C3";
    default:
      return "#DBEAFE";
  }
}

async function highlightAllDeviations(deviations: Deviation[]): Promise<void> {
  await Word.run(async (context) => {
    for (const dev of deviations) {
      if (dev.locationHint && dev.locationHint !== "Not found in document") {
        const color = getSeverityColor(dev.severity);

        const results = context.document.body.search(dev.locationHint, {
          matchCase: false,
        });
        results.load("items");
        await context.sync();

        if (results.items.length > 0) {
          const range = results.items[0];
          const cc = range.insertContentControl();
          cc.title = dev.clauseTitle;
          cc.tag = "casus-benchmark";
          cc.appearance = Word.ContentControlAppearance.boundingBox;
          range.font.highlightColor = color;
        }
      }
    }

    await context.sync();
  });
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

// ──────────────────────────────────────────
// React Taskpane Component
// ──────────────────────────────────────────

export default function BenchmarkTaskpane() {
  const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState("");
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/playbooks`)
      .then((res) => res.json())
      .then((data: PlaybookSummary[]) => {
        setPlaybooks(data);
        if (data.length > 0) {
          setSelectedPlaybook(data[0].id);
        }
      })
      .catch(() => {
        setError("Could not connect to backend. Is it running on port 3001?");
      });
  }, []);

  const handleRunBenchmark = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const documentText = await readDocumentText();

      if (!documentText || documentText.trim().length < 20) {
        setError(
          "Document appears empty or too short. Please open a contract document."
        );
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText,
          playbookId: selectedPlaybook,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(
          errBody?.error || `Backend returned ${response.status}`
        );
      }

      const data: BenchmarkResult = await response.json();
      setResult(data);

      await highlightAllDeviations(data.deviations);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = async (locationHint: string) => {
    await navigateToText(locationHint);
  };

  const handleApplyFix = async (deviation: Deviation) => {
    if (!deviation.suggestedFix) return;

    try {
      if (deviation.deviationType === "missing") {
        await insertMissingClause(deviation.suggestedFix);
      } else {
        await applyFix(deviation.documentExcerpt, deviation.suggestedFix);
      }
    } catch (err) {
      setError("Failed to apply fix. The clause text may have changed.");
    }
  };

  return (
    <div className="taskpane">
      <h2>CASUS Benchmark</h2>
      <p className="subtitle">
        Analyze this document against a legal playbook
      </p>

      {/* Playbook selector */}
      <select
        className="playbook-select"
        value={selectedPlaybook}
        onChange={(e) => setSelectedPlaybook(e.target.value)}
        disabled={loading}
      >
        {playbooks.map((pb) => (
          <option key={pb.id} value={pb.id}>
            {pb.name} ({pb.clauseCount} clauses)
          </option>
        ))}
      </select>

      {/* Run button */}
      <button
        className="run-btn"
        onClick={handleRunBenchmark}
        disabled={loading || !selectedPlaybook}
      >
        {loading ? (
          <span>
            Analyzing<span className="loading-dots"></span>
          </span>
        ) : (
          "Run Benchmark"
        )}
      </button>

      {/* Error */}
      {error && <div className="error-msg">{error}</div>}

      {/* Results */}
      {result && (
        <>
          {/* Alignment score */}
          <div className="score-section">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>Alignment Score</span>
              <span
                style={{
                  fontWeight: 700,
                  color: getScoreColor(result.alignmentScore),
                }}
              >
                {result.alignmentScore}%
              </span>
            </div>
            <div className="score-bar-bg">
              <div
                className="score-bar-fill"
                style={{
                  width: `${result.alignmentScore}%`,
                  background: getScoreColor(result.alignmentScore),
                }}
              />
            </div>
            <p className="summary-text">{result.summary}</p>
          </div>

          {/* Deviation cards */}
          {result.deviations
            .filter((d) => d.deviationType !== "ok")
            .map((dev, i) => (
              <div className="deviation-card" key={i}>
                <div className="deviation-header">
                  <span className="deviation-title">{dev.clauseTitle}</span>
                  <span
                    className={`severity-badge severity-${dev.severity}`}
                  >
                    {dev.severity}
                  </span>
                </div>
                <div className="deviation-type">{dev.deviationType}</div>
                <p className="deviation-explanation">{dev.explanation}</p>

                <div className="deviation-actions">
                  {dev.locationHint &&
                    dev.locationHint !== "Not found in document" && (
                      <button
                        className="action-btn"
                        onClick={() => handleNavigate(dev.locationHint)}
                      >
                        Go to clause
                      </button>
                    )}
                  {dev.suggestedFix && (
                    <button
                      className="action-btn primary"
                      onClick={() => handleApplyFix(dev)}
                    >
                      Apply Fix
                    </button>
                  )}
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
