import { useState, useRef, useCallback } from "react";
import mammoth from "mammoth";
import BenchmarkPanel from "./components/BenchmarkPanel";
import BenchmarkResults from "./components/BenchmarkResults";
import ReviewResults from "./components/ReviewResults";
import type { BenchmarkResult, ReviewResult } from "./types";

type Feature = "benchmark" | "review";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (ext === "txt" || ext === "md") {
    return file.text();
  }

  throw new Error(
    `Unsupported file type: .${ext}. Please upload a .docx or .txt file.`
  );
}

export default function App() {
  const [documentText, setDocumentText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [activeFeature, setActiveFeature] = useState<Feature>("benchmark");
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);

    try {
      const text = await extractText(file);
      setDocumentText(text);
      setUploadedFile({ name: file.name, size: file.size, type: file.type });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemoveFile = useCallback(() => {
    setDocumentText("");
    setUploadedFile(null);
    setResult(null);
    setReviewResult(null);
    setError(null);
    setShowPasteArea(false);
    setPasteText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

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

  const handleReview = async () => {
    setLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const res = await fetch("http://localhost:3001/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Review failed");
      }

      const data: ReviewResult = await res.json();
      setReviewResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const hasDocument = documentText.length > 0;

  return (
    <div
      style={{
        background: "#0B0E11",
        minHeight: "100vh",
        color: "#E2E8F0",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #1E2A3A",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            C
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>
            CASUS
          </span>
          <span
            style={{
              fontSize: 12,
              color: "#64748B",
              marginLeft: 8,
              padding: "2px 8px",
              background: "rgba(59,130,246,0.1)",
              borderRadius: 4,
            }}
          >
            Benchmark Demo
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#475569" }}>
          Interview Prep — Feb 2026
        </span>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 65px)" }}>
        {/* Left: Document Area */}
        <div
          style={{
            flex: 1,
            borderRight: "1px solid #1E2A3A",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Document header bar */}
          <div
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid #1E2A3A",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#94A3B8",
                  letterSpacing: "0.5px",
                }}
              >
                DOCUMENT
              </span>
              {uploadedFile && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#3B82F6",
                    background: "rgba(59,130,246,0.1)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {uploadedFile.name}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {hasDocument && (
                <span style={{ fontSize: 11, color: "#475569" }}>
                  {documentText.length.toLocaleString()} chars
                </span>
              )}
              {uploadedFile && (
                <button
                  onClick={handleRemoveFile}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 500,
                    background: "rgba(239,68,68,0.1)",
                    color: "#EF4444",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Upload zone OR paste area OR document text */}
          {!hasDocument && showPasteArea ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: 20,
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748B" }}>
                  Paste your contract text below:
                </span>
                <button
                  onClick={() => {
                    setShowPasteArea(false);
                    setPasteText("");
                  }}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    background: "transparent",
                    color: "#64748B",
                    border: "1px solid #1E2A3A",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Back to upload
                </button>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste contract text here..."
                style={{
                  flex: 1,
                  resize: "none",
                  background: "#141920",
                  color: "#E2E8F0",
                  border: "1px solid #1E2A3A",
                  borderRadius: 8,
                  padding: "16px",
                  fontSize: 13,
                  lineHeight: 1.7,
                  fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                  outline: "none",
                }}
              />
              <button
                onClick={() => {
                  if (pasteText.trim().length > 0) {
                    setDocumentText(pasteText);
                    setUploadedFile({
                      name: "pasted-document.txt",
                      size: pasteText.length,
                      type: "text/plain",
                    });
                    setShowPasteArea(false);
                  }
                }}
                disabled={pasteText.trim().length === 0}
                style={{
                  padding: "10px 24px",
                  background:
                    pasteText.trim().length > 0 ? "#3B82F6" : "#1E2A3A",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    pasteText.trim().length > 0 ? "pointer" : "not-allowed",
                  transition: "background 0.15s",
                }}
              >
                Load Document ({pasteText.length.toLocaleString()} chars)
              </button>
            </div>
          ) : !hasDocument ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                background: dragOver
                  ? "rgba(59,130,246,0.05)"
                  : "transparent",
                transition: "background 0.2s",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 460,
                  border: `2px dashed ${dragOver ? "#3B82F6" : "#1E2A3A"}`,
                  borderRadius: 16,
                  padding: "48px 32px",
                  textAlign: "center",
                  transition: "border-color 0.2s",
                }}
              >
                {parsing ? (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>
                      <span className="spin">&#9881;</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#E2E8F0" }}>
                      Reading document...
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>
                      &#128196;
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#E2E8F0",
                        marginBottom: 8,
                      }}
                    >
                      Upload a contract
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#64748B",
                        marginBottom: 24,
                        lineHeight: 1.6,
                      }}
                    >
                      Drag and drop a <strong>.docx</strong> or{" "}
                      <strong>.txt</strong> file here, or click to browse
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: "10px 24px",
                        background: "#3B82F6",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      Browse Files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.txt,.md"
                      onChange={handleFileInput}
                      style={{ display: "none" }}
                    />
                    <div
                      style={{
                        marginTop: 16,
                        fontSize: 11,
                        color: "#475569",
                      }}
                    >
                      Supported: .docx, .txt
                    </div>

                    <div
                      style={{
                        marginTop: 24,
                        paddingTop: 20,
                        borderTop: "1px solid #1E2A3A",
                      }}
                    >
                      <button
                        onClick={() => setShowPasteArea(true)}
                        style={{
                          padding: "8px 20px",
                          background: "transparent",
                          color: "#64748B",
                          border: "1px solid #1E2A3A",
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        Or paste text directly
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <textarea
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Document text will appear here after upload..."
              style={{
                flex: 1,
                resize: "none",
                background: "#141920",
                color: "#E2E8F0",
                border: "none",
                padding: "20px",
                fontSize: 13,
                lineHeight: 1.7,
                fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                outline: "none",
              }}
            />
          )}
        </div>

        {/* Right: Feature Panel + Results */}
        <div
          style={{
            width: 480,
            display: "flex",
            flexDirection: "column",
            background: "rgba(0,0,0,0.15)",
          }}
        >
          {/* Feature Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #1E2A3A",
            }}
          >
            {(
              [
                { id: "benchmark" as Feature, label: "Benchmark" },
                { id: "review" as Feature, label: "Review" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFeature(tab.id)}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background:
                    activeFeature === tab.id
                      ? "rgba(59,130,246,0.08)"
                      : "transparent",
                  color:
                    activeFeature === tab.id ? "#3B82F6" : "#64748B",
                  border: "none",
                  borderBottom:
                    activeFeature === tab.id
                      ? "2px solid #3B82F6"
                      : "2px solid transparent",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  letterSpacing: "0.3px",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Feature-specific panel */}
          {activeFeature === "benchmark" ? (
            <BenchmarkPanel
              onRunBenchmark={handleBenchmark}
              loading={loading}
              disabled={!hasDocument}
            />
          ) : (
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #1E2A3A",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#64748B",
                  lineHeight: 1.5,
                  marginBottom: 12,
                }}
              >
                Identify risks, red flags, and weaknesses in your contract.
                No playbook needed — works on any document.
              </div>
              <button
                onClick={handleReview}
                disabled={loading || !hasDocument}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  background:
                    loading ? "#1E2A3A" : "#8B5CF6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? "wait" : "pointer",
                  transition: "all 0.2s",
                  opacity: loading || !hasDocument ? 0.7 : 1,
                }}
              >
                {loading ? "Analyzing..." : "Run Risk Review"}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                margin: "0 16px",
                padding: 12,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                fontSize: 12,
                color: "#EF4444",
              }}
            >
              {error}
            </div>
          )}

          {/* Results — show the active feature's results */}
          {activeFeature === "benchmark" && result && (
            <BenchmarkResults result={result} />
          )}
          {activeFeature === "review" && reviewResult && (
            <ReviewResults result={reviewResult} />
          )}

          {/* Empty state */}
          {((activeFeature === "benchmark" && !result) ||
            (activeFeature === "review" && !reviewResult)) &&
            !loading &&
            !error && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 32,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 40,
                      marginBottom: 16,
                      opacity: 0.5,
                    }}
                  >
                    {activeFeature === "benchmark"
                      ? "\u{1F4CA}"
                      : "\u{1F6E1}"}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#64748B",
                      lineHeight: 1.6,
                      maxWidth: 280,
                    }}
                  >
                    {!hasDocument
                      ? "Upload a contract document to get started."
                      : activeFeature === "benchmark"
                        ? "Select a playbook and run benchmark to analyze your document."
                        : "Click Run Risk Review to identify risks and weaknesses."}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
