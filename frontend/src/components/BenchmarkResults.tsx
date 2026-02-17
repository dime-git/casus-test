import { useState } from "react";
import type { BenchmarkResult, ClauseDeviation } from "../types";

interface Props {
  result: BenchmarkResult;
}

const SEVERITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: "rgba(239,68,68,0.12)", color: "#EF4444", label: "CRITICAL" },
  major: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", label: "MAJOR" },
  minor: { bg: "rgba(59,130,246,0.12)", color: "#3B82F6", label: "MINOR" },
  info: { bg: "rgba(100,116,139,0.12)", color: "#94A3B8", label: "INFO" },
};

const DEVIATION_STYLES: Record<string, { color: string; label: string }> = {
  missing: { color: "#EF4444", label: "Missing" },
  weaker: { color: "#F59E0B", label: "Weaker" },
  stronger: { color: "#10B981", label: "Stronger" },
  different: { color: "#8B5CF6", label: "Different" },
  ok: { color: "#10B981", label: "OK" },
};

function AlignmentMeter({ score }: { score: number }) {
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 8, background: "#1E2A3A", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 20, fontWeight: 700, color, minWidth: 50, textAlign: "right" }}>
        {score}%
      </span>
    </div>
  );
}

function DeviationCard({ deviation }: { deviation: ClauseDeviation }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_STYLES[deviation.severity];
  const dev = DEVIATION_STYLES[deviation.deviationType];

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "#141920", border: "1px solid #1E2A3A", borderRadius: 8,
        padding: "12px 14px", cursor: "pointer", transition: "all 0.2s",
        borderLeftWidth: 3, borderLeftColor: sev.color,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", marginBottom: 4 }}>
            {deviation.clauseTitle}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: sev.bg, color: sev.color }}>
              {sev.label}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: "rgba(255,255,255,0.05)", color: dev.color }}>
              {dev.label}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 12, color: "#475569", transform: expanded ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }}>
          ▶
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ color: "#94A3B8", marginBottom: 10 }}>
            {deviation.explanation}
          </div>

          {deviation.locationHint !== "Not found in document" && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>FOUND IN DOCUMENT:</span>
              <div style={{ marginTop: 4, padding: "8px 10px", background: "rgba(239,68,68,0.06)", borderRadius: 4, borderLeft: "2px solid #EF4444", color: "#F87171", fontFamily: "monospace", fontSize: 11 }}>
                "{deviation.documentExcerpt}"
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>STANDARD REQUIRES:</span>
            <div style={{ marginTop: 4, padding: "8px 10px", background: "rgba(16,185,129,0.06)", borderRadius: 4, borderLeft: "2px solid #10B981", color: "#6EE7B7", fontFamily: "monospace", fontSize: 11 }}>
              "{deviation.standardExcerpt}"
            </div>
          </div>

          {deviation.suggestedFix && (
            <div>
              <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>SUGGESTED FIX:</span>
              <div style={{ marginTop: 4, padding: "8px 10px", background: "rgba(59,130,246,0.06)", borderRadius: 4, borderLeft: "2px solid #3B82F6", color: "#93C5FD", fontSize: 11 }}>
                {deviation.suggestedFix}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // In production + Office.js: this would call
                  // Word.run(async (ctx) => { ... insertText with Track Changes })
                  alert(
                    "In the Word Add-in, this button calls Office.js to insert the fix directly into the document with Track Changes enabled (redlining)."
                  );
                }}
                style={{
                  marginTop: 8, padding: "6px 12px", background: "rgba(59,130,246,0.15)",
                  color: "#3B82F6", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 6,
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}
              >
                Insert Fix (Office.js in Word)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BenchmarkResults({ result }: Props) {
  const counts = {
    critical: result.deviations.filter((d) => d.severity === "critical").length,
    major: result.deviations.filter((d) => d.severity === "major").length,
    minor: result.deviations.filter((d) => d.severity === "minor").length,
    ok: result.deviations.filter((d) => d.deviationType === "ok").length,
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
      {/* Alignment Score */}
      <div style={{ marginBottom: 16, padding: 16, background: "#141920", borderRadius: 10, border: "1px solid #1E2A3A" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.5px", marginBottom: 8 }}>
          ALIGNMENT WITH {result.playbook.toUpperCase()}
        </div>
        <AlignmentMeter score={result.alignmentScore} />
        <div style={{ marginTop: 10, fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
          {result.summary}
        </div>
      </div>

      {/* Severity Counts */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {Object.entries(counts).map(([key, count]) => {
          const style = key === "ok"
            ? { bg: "rgba(16,185,129,0.12)", color: "#10B981" }
            : SEVERITY_STYLES[key];
          return (
            <div key={key} style={{ flex: 1, padding: "8px 10px", background: style?.bg || "#141920", borderRadius: 6, textAlign: "center" as const }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: style?.color || "#94A3B8" }}>{count}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: style?.color || "#94A3B8", letterSpacing: "0.5px" }}>
                {key.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deviation List */}
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.5px", marginBottom: 10 }}>
        DEVIATIONS ({result.deviations.filter((d) => d.deviationType !== "ok").length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {result.deviations
          .filter((d) => d.deviationType !== "ok")
          .map((d, i) => (
            <DeviationCard key={i} deviation={d} />
          ))}
      </div>
    </div>
  );
}
