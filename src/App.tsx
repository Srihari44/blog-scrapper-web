import { useState, useEffect, useRef, useCallback } from "react";
import { UrlInputPanel } from "./components/UrlInputPanel";
import { UrlCard } from "./components/UrlCard";
import { ModelBanner } from "./components/ModelBanner";
import { loadEngine, resetEngine, summarizeBlog, isEngineReady } from "./llm";
import type { UrlEntry, ModelStatus } from "./types";
import "./App.css";

const DEFAULT_MODEL = "/model.litertlm";

let idCounter = 0;
const genId = () => `url-${++idCounter}`;

async function fetchContent(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const res = await fetch(jinaUrl, {
    headers: { Accept: "text/plain" },
  });
  if (!res.ok) throw new Error(`Jina fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (!text || text.trim().length < 50) throw new Error("Fetched content is too short or empty");
  return text;
}

/** Shows the currently-active URL card in column 2 */
function InProgressCard({ entry }: { entry: UrlEntry }) {
  const hostname = (() => {
    try { return new URL(entry.url).hostname; } catch { return entry.url; }
  })();

  const statusLabel: Record<string, string> = {
    fetching: "Fetching content…",
    analyzing: "Processing…",
    streaming: "Generating summary…",
  };

  return (
    <div className="inprogress-card">
      <div className="inprogress-url-bar">
        <img
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
          alt="" width={16} height={16}
          onError={(e) => (e.currentTarget.style.display = "none")}
          style={{ borderRadius: 3 }}
        />
        <a href={entry.url} target="_blank" rel="noopener noreferrer" className="inprogress-url-text">
          {hostname}
        </a>
        <span className={`status-pill pill-${entry.status}`}>
          <span className="spinner-sm" />
          {statusLabel[entry.status] ?? entry.status}
        </span>
      </div>
      <div className="inprogress-stream">
        {entry.status === "fetching" || entry.status === "analyzing" ? (
          <div className="card-placeholder" style={{ padding: "16px" }}>
            <div className="shimmer-line w-3/4" />
            <div className="shimmer-line w-full" />
            <div className="shimmer-line w-5/6" />
            <div className="shimmer-line w-1/2 mt-2" />
          </div>
        ) : entry.streamText !== undefined ? (
          <pre className="stream-text inprogress-stream-text">{entry.streamText || " "}</pre>
        ) : null}
      </div>
    </div>
  );
}

function App() {
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>({ state: "idle" });
  const [modelFile, setModelFile] = useState(DEFAULT_MODEL);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const handleLoadModel = useCallback(async (path: string) => {
    setModelStatus({ state: "loading", progress: 0, message: "Starting…" });
    try {
      await loadEngine(path, (progress, message) => {
        setModelStatus({ state: "loading", progress, message });
      });
      setModelStatus({ state: "ready" });
    } catch (err) {
      setModelStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Failed to load model",
      });
    }
  }, []);

  // Auto-load model on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleLoadModel(modelFile);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeModel = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the singleton so the new model can be loaded fresh
    resetEngine();
    // Create a local object URL — works for files dropped by user
    const objectUrl = URL.createObjectURL(file);
    setModelFile(file.name);
    handleLoadModel(objectUrl);
    // Reset file input so same file can be re-selected
    e.target.value = "";
  };

  const addUrl = useCallback((url: string) => {
    setUrls((prev) => [...prev, { id: genId(), url, status: "idle" }]);
  }, []);

  const removeUrl = useCallback((id: string) => {
    setUrls((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearUrls = useCallback(() => {
    setUrls([]);
  }, []);

  const updateEntry = useCallback(
    (id: string, patch: Partial<UrlEntry>) => {
      setUrls((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    []
  );

  const handleAnalyze = useCallback(async () => {
    if (!isEngineReady() || isRunning) return;

    abortRef.current = false;
    setIsRunning(true);

    // Reset all to idle first
    setUrls((prev) =>
      prev.map((e) => ({ ...e, status: "idle", result: undefined, error: undefined, streamText: undefined, elapsedSeconds: undefined, startTime: undefined }))
    );

    for (const entry of urls) {
      if (abortRef.current) break;

      const startTime = performance.now();
      const startTimestamp = Date.now();
      const getElapsed = () => parseFloat(((performance.now() - startTime) / 1000).toFixed(1));

      // Step 1: Fetch
      updateEntry(entry.id, { status: "fetching", startTime: startTimestamp });
      let content: string;
      try {
        content = await fetchContent(entry.url);
      } catch (err) {
        updateEntry(entry.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Failed to fetch content",
          elapsedSeconds: getElapsed(),
        });
        continue;
      }

      if (abortRef.current) break;

      // Step 2: Stream LLM
      updateEntry(entry.id, { status: "streaming", streamText: "" });

      try {
        const generator = summarizeBlog(content);
        let accumulated = "";

        while (true) {
          const { value, done } = await generator.next();

          if (done) {
            // value here is the BlogSummary returned from the generator
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = value as any;
            if (result && typeof result === "object" && "title" in result) {
              updateEntry(entry.id, { status: "done", result, streamText: undefined, elapsedSeconds: getElapsed() });
            } else {
              // Try to parse from accumulated
              try {
                const cleaned = accumulated
                  .replace(/^```json\s*/i, "")
                  .replace(/^```\s*/i, "")
                  .replace(/```\s*$/i, "")
                  .trim();
                const parsed = JSON.parse(cleaned);
                updateEntry(entry.id, { status: "done", result: parsed, streamText: undefined, elapsedSeconds: getElapsed() });
              } catch {
                const match = accumulated.match(/\{[\s\S]*\}/);
                if (match) {
                  try {
                    updateEntry(entry.id, {
                      status: "done",
                      result: JSON.parse(match[0]),
                      streamText: undefined,
                      elapsedSeconds: getElapsed(),
                    });
                  } catch {
                    updateEntry(entry.id, {
                      status: "error",
                      error: "Failed to parse model response as JSON",
                      elapsedSeconds: getElapsed(),
                    });
                  }
                } else {
                  updateEntry(entry.id, {
                    status: "error",
                    error: "Failed to parse model response as JSON",
                    elapsedSeconds: getElapsed(),
                  });
                }
              }
            }
            break;
          }

          if (typeof value === "string") {
            accumulated += value;
            updateEntry(entry.id, { streamText: accumulated });
          }
        }
      } catch (err) {
        updateEntry(entry.id, {
          status: "error",
          error: err instanceof Error ? err.message : "LLM error",
          elapsedSeconds: getElapsed(),
        });
      }
    }

    setIsRunning(false);
  }, [urls, isRunning, updateEntry]);

  const handleExportJson = useCallback(() => {
    const exportResults = urls
      .filter((e) => e.status === "done" && e.result)
      .map((e) => ({
        url: e.url,
        title: e.result?.title,
        summary: e.result?.summary,
        read_time_minutes: e.result?.read_time_minutes,
        tags: e.result?.tags,
        sentiment: e.result?.sentiment,
        elapsed_seconds: e.elapsedSeconds,
      }));

    if (exportResults.length === 0) return;

    const blob = new Blob([JSON.stringify(exportResults, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blog-summaries-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [urls]);

  const doneCount = urls.filter((e) => e.status === "done").length;
  const errorCount = urls.filter((e) => e.status === "error").length;
  const totalCount = urls.length;

  // In-progress entry: currently fetching or streaming
  const inProgressEntry = urls.find(
    (e) => e.status === "fetching" || e.status === "analyzing" || e.status === "streaming"
  );

  // Completed entries: done or error
  const completedEntries = urls.filter((e) => e.status === "done" || e.status === "error");

  // Whether any processing has started (to show columns 2 & 3)
  const hasStarted = urls.some((e) => e.status !== "idle");

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="brand-title">BlogLens</h1>
            <p className="brand-sub">On-device AI blog summarizer</p>
          </div>
        </div>
        {(doneCount > 0 || errorCount > 0) && (
          <div className="header-stats">
            {doneCount > 0 && <span className="stat stat-done">✅ {doneCount} done</span>}
            {errorCount > 0 && <span className="stat stat-error">❌ {errorCount} failed</span>}
          </div>
        )}
      </header>

      {/* Model Banner */}
      <ModelBanner
        status={modelStatus}
        modelFile={modelFile}
        onChangeModel={handleChangeModel}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".litertlm"
        style={{ display: "none" }}
        onChange={handleFileChange}
        id="model-file-input"
      />

      {/* Three-column workspace */}
      <div className={`workspace ${hasStarted ? "workspace-active" : ""}`}>

        {/* ── Column 1: URL Input ── */}
        <div className="col col-input">
          <div className="col-header">
            <span className="col-number">01</span>
            <span className="col-title">Add URLs</span>
            <span className="col-hint">Paste one or many</span>
          </div>
          <UrlInputPanel
            urls={urls}
            onAdd={addUrl}
            onRemove={removeUrl}
            onClear={clearUrls}
            onAnalyze={handleAnalyze}
            isRunning={isRunning}
            modelReady={modelStatus.state === "ready"}
          />
        </div>

        {/* ── Column 2: In-progress (live stream) ── */}
        {hasStarted && (
          <div className="col col-inprogress">
            <div className="col-header">
              <span className="col-number">02</span>
              <span className="col-title">In Progress</span>
              {inProgressEntry && <span className="col-hint live-badge">● Live</span>}
            </div>
            <div className="inprogress-panel">
              {inProgressEntry ? (
                <InProgressCard entry={inProgressEntry} />
              ) : (
                <div className="inprogress-empty">
                  {isRunning ? (
                    <><span className="spinner" /> Processing…</>
                  ) : (
                    <span>No active job</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Column 3: Completed ── */}
        {hasStarted && (
          <div className="col col-completed">
            <div className="col-header">
              <span className="col-number">03</span>
              <span className="col-title">Completed</span>
              <span className="col-counter">
                <span className="counter-done">{doneCount + errorCount}</span>
                <span className="counter-sep">/</span>
                <span className="counter-total">{totalCount}</span>
              </span>
              {doneCount > 0 && (
                <button
                  id="export-json-btn"
                  className="btn btn-secondary btn-sm col-export"
                  onClick={handleExportJson}
                  disabled={isRunning}
                  title="Export completed summaries to JSON"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export
                </button>
              )}
            </div>
            <div className="completed-list" id="results-grid">
              {completedEntries.length === 0 ? (
                <div className="completed-empty">Results will appear here…</div>
              ) : (
                completedEntries.map((entry) => (
                  <UrlCard key={entry.id} entry={entry} />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="app-footer">
        <p>Powered by <strong>LiteRT-LM</strong> · Content via <strong>Jina Reader</strong> · 100% on-device inference</p>
      </footer>
    </div>
  );
}

export default App;
