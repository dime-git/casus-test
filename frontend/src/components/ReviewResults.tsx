import { useState } from "react";
import type { ReviewResult, RiskFinding } from "../types";

interface Props {
  result: ReviewResult;
}

const SEVERITY_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  critical: {
    bg: "rgba(239,68,68,0.12)",
    color: "#EF4444",
    label: "CRITICAL",
  },
  major: {
    bg: "rgba(245,158,11,0.12)",
    color: "#F59E0B",
    label: "MAJOR",
  },
  minor: {
    bg: "rgba(59,130,246,0.12)",
    color: "#3B82F6",
    label: "MINOR",
  },
  info: {
    bg: "rgba(100,116,139,0.12)",
    color: "#94A3B8",
    label: "INFO",
  },
};

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  liability: { label: "Liability", icon: "&#9888;" },
  termination: { label: "Termination", icon: "&#9210;" },
  intellectual_property: { label: "IP", icon: "&#128161;" },
  confidentiality: { label: "Confidentiality", icon: "&#128274;" },
  payment: { label: "Payment", icon: "&#128176;" },
  data_protection: { label: "Data Protection", icon: "&#128737;" },
  governing_law: { label: "Governing Law", icon: "&#9878;" },
  indemnification: { label: "Indemnification", icon: "&#128722;" },
  non_compete: { label: "Non-Compete", icon: "&#128683;" },
  general: { label: "General", icon: "&#128196;" },
};

function RiskMeter({ score }: { score: number }) {
  const color =
    score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";
  const label =
    score >= 70 ? "Low Risk" : score >= 40 ? "Moderate Risk" : "High Risk";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, color: "#94A3B8" }}>{label}</span>
        <span style={{ fontSize: 24, fontWeight: 700, color }}>
          {score}/100
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 8,
          background: "#1E2A3A",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: RiskFinding }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_STYLES[finding.severity];
  const cat = CATEGORY_LABELS[finding.riskCategory] || CATEGORY_LABELS.general;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "#141920",
        border: "1px solid #1E2A3A",
        borderRadius: 8,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.2s",
        borderLeftWidth: 3,
        borderLeftColor: sev.color,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#E2E8F0",
              marginBottom: 4,
            }}
          >
            {finding.title}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 3,
                background: sev.bg,
                color: sev.color,
              }}
            >
              {sev.label}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 3,
                background: "rgba(255,255,255,0.05)",
                color: "#94A3B8",
              }}
              dangerouslySetInnerHTML={{
                __html: `${cat.icon} ${cat.label}`,
              }}
            />
          </div>
        </div>
        <span
          style={{
            fontSize: 12,
            color: "#475569",
            transform: expanded ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }}
        >
          &#9654;
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ color: "#94A3B8", marginBottom: 10 }}>
            {finding.explanation}
          </div>

          {finding.documentExcerpt !== "N/A" && (
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  color: "#64748B",
                  fontWeight: 600,
                }}
              >
                IN DOCUMENT:
              </span>
              <div
                style={{
                  marginTop: 4,
                  padding: "8px 10px",
                  background: "rgba(239,68,68,0.06)",
                  borderRadius: 4,
                  borderLeft: "2px solid #EF4444",
                  color: "#F87171",
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
              >
                &ldquo;{finding.documentExcerpt}&rdquo;
              </div>
            </div>
          )}

          {finding.suggestedAlternative && (
            <div>
              <span
                style={{
                  fontSize: 10,
                  color: "#64748B",
                  fontWeight: 600,
                }}
              >
                SUGGESTED ALTERNATIVE:
              </span>
              <div
                style={{
                  marginTop: 4,
                  padding: "8px 10px",
                  background: "rgba(16,185,129,0.06)",
                  borderRadius: 4,
                  borderLeft: "2px solid #10B981",
                  color: "#6EE7B7",
                  fontSize: 11,
                }}
              >
                {finding.suggestedAlternative}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReviewResults({ result }: Props) {
  const counts = {
    critical: result.findings.filter((f) => f.severity === "critical").length,
    major: result.findings.filter((f) => f.severity === "major").length,
    minor: result.findings.filter((f) => f.severity === "minor").length,
    info: result.findings.filter((f) => f.severity === "info").length,
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
      {/* Risk Score */}
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          background: "#141920",
          borderRadius: 10,
          border: "1px solid #1E2A3A",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#64748B",
            letterSpacing: "0.5px",
            marginBottom: 4,
          }}
        >
          RISK ASSESSMENT — {result.documentType.toUpperCase()}
        </div>
        <RiskMeter score={result.riskScore} />
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#94A3B8",
            lineHeight: 1.6,
          }}
        >
          {result.summary}
        </div>
      </div>

      {/* Severity Counts */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {Object.entries(counts).map(([key, count]) => {
          const style = SEVERITY_STYLES[key];
          return (
            <div
              key={key}
              style={{
                flex: 1,
                padding: "8px 10px",
                background: style?.bg || "#141920",
                borderRadius: 6,
                textAlign: "center" as const,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: style?.color || "#94A3B8",
                }}
              >
                {count}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: style?.color || "#94A3B8",
                  letterSpacing: "0.5px",
                }}
              >
                {key.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Findings List */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#64748B",
          letterSpacing: "0.5px",
          marginBottom: 10,
        }}
      >
        FINDINGS ({result.totalFindings})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {result.findings.map((f, i) => (
          <FindingCard key={i} finding={f} />
        ))}
      </div>
    </div>
  );
}
