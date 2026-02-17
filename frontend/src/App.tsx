import { useState } from "react";
import BenchmarkPanel from "./components/BenchmarkPanel";
import BenchmarkResults from "./components/BenchmarkResults";
import type { BenchmarkResult, PlaybookSummary } from "./types";

const SAMPLE_NDA = `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of January 15, 2026 ("Effective Date") by and between:

Party A: TechCorp GmbH, a company organized under the laws of Germany, with offices at Maximilianstraße 35, 80539 Munich, Germany ("Disclosing Party")

Party B: InnoVentures AG, a company organized under the laws of Switzerland, with offices at Bahnhofstrasse 10, 8001 Zurich, Switzerland ("Receiving Party")

WHEREAS, the Parties wish to explore a potential business relationship and, in connection therewith, may disclose certain confidential information to each other.

1. DEFINITION OF CONFIDENTIAL INFORMATION
Confidential Information shall mean any proprietary data shared between the parties.

2. OBLIGATIONS
The receiving party agrees to keep all shared information confidential and not share it with others.

3. TERM
This agreement is valid for one (1) year from the date of signing.

4. GOVERNING LAW
This agreement shall be governed by the laws of Germany. Disputes shall be resolved in the courts of Munich.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

_________________________          _________________________
TechCorp GmbH                     InnoVentures AG
Name:                              Name:
Title:                             Title:
Date:                              Date:`;

export default function App() {
  const [documentText, setDocumentText] = useState(SAMPLE_NDA);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBenchmark = async (playbookId: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("http://localhost:3001/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText, playbook: playbookId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Benchmark failed");
      }

      const data: BenchmarkResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#0B0E11", minHeight: "100vh", color: "#E2E8F0", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #1E2A3A", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>C</div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>CASUS</span>
          <span style={{ fontSize: 12, color: "#64748B", marginLeft: 8, padding: "2px 8px", background: "rgba(59,130,246,0.1)", borderRadius: 4 }}>Benchmark Demo</span>
        </div>
        <span style={{ fontSize: 11, color: "#475569" }}>Interview Prep — Feb 2026</span>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 65px)" }}>
        {/* Left: Document Editor */}
        <div style={{ flex: 1, borderRight: "1px solid #1E2A3A", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #1E2A3A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.5px" }}>DOCUMENT</span>
            <span style={{ fontSize: 11, color: "#475569" }}>{documentText.length} characters</span>
          </div>
          <textarea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Paste your contract text here..."
            style={{
              flex: 1, resize: "none", background: "#141920", color: "#E2E8F0",
              border: "none", padding: "20px", fontSize: 13, lineHeight: 1.7,
              fontFamily: "'JetBrains Mono', 'SF Mono', monospace", outline: "none",
            }}
          />
        </div>

        {/* Right: Benchmark Panel + Results */}
        <div style={{ width: 480, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.15)" }}>
          <BenchmarkPanel onRunBenchmark={handleBenchmark} loading={loading} />

          {error && (
            <div style={{ margin: "0 16px", padding: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 12, color: "#EF4444" }}>
              {error}
            </div>
          )}

          {result && <BenchmarkResults result={result} />}

          {!result && !loading && !error && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
                <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
                  Select a playbook and run benchmark to compare your document against the standard.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
