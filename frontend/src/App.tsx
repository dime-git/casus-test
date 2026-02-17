import { useState, useRef, useCallback } from "react";
import mammoth from "mammoth";
import BenchmarkPanel from "./components/BenchmarkPanel";
import BenchmarkResults from "./components/BenchmarkResults";
import type { BenchmarkResult } from "./types";

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
  const [result, setResult] = useState<BenchmarkResult | null>(null);
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

        {/* Right: Benchmark Panel + Results */}
        <div
          style={{
            width: 480,
            display: "flex",
            flexDirection: "column",
            background: "rgba(0,0,0,0.15)",
          }}
        >
          <BenchmarkPanel
            onRunBenchmark={handleBenchmark}
            loading={loading}
            disabled={!hasDocument}
          />

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

          {result && <BenchmarkResults result={result} />}

          {!result && !loading && !error && (
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
                <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }}>
                  &#128202;
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "#64748B",
                    lineHeight: 1.6,
                    maxWidth: 280,
                  }}
                >
                  {hasDocument
                    ? "Select a playbook and run benchmark to analyze your document."
                    : "Upload a contract document to get started."}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
