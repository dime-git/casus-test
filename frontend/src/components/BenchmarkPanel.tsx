import { useState, useEffect } from "react";
import type { PlaybookSummary } from "../types";

interface Props {
  onRunBenchmark: (playbookId: string) => void;
  loading: boolean;
}

export default function BenchmarkPanel({ onRunBenchmark, loading }: Props) {
  const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    fetch("http://localhost:3001/api/playbooks")
      .then((r) => r.json())
      .then((data) => {
        setPlaybooks(data);
        if (data.length > 0) setSelected(data[0].id);
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E2A3A" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.5px", marginBottom: 12 }}>
        BENCHMARK
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: "#64748B", display: "block", marginBottom: 6 }}>
          Select Playbook (Standard)
        </label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{
            width: "100%", padding: "8px 12px", background: "#141920",
            border: "1px solid #1E2A3A", borderRadius: 6, color: "#E2E8F0",
            fontSize: 13, outline: "none", cursor: "pointer",
          }}
        >
          {playbooks.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.clauseCount} clauses)
            </option>
          ))}
        </select>
      </div>

      {playbooks.find((p) => p.id === selected) && (
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 12, lineHeight: 1.5 }}>
          {playbooks.find((p) => p.id === selected)?.description}
        </div>
      )}

      <button
        onClick={() => selected && onRunBenchmark(selected)}
        disabled={loading || !selected}
        style={{
          width: "100%", padding: "10px 16px", background: loading ? "#1E2A3A" : "#3B82F6",
          color: "#fff", border: "none", borderRadius: 8, fontSize: 13,
          fontWeight: 600, cursor: loading ? "wait" : "pointer",
          transition: "all 0.2s", opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Analyzing..." : "Run Benchmark"}
      </button>
    </div>
  );
}
