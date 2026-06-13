import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
} from "react";
import { Download, Orbit } from "lucide-react";
import { UrlInputPanel } from "./components/UrlInputPanel";
import { UrlCard } from "./components/UrlCard";
import { ModelBanner } from "./components/ModelBanner";
import { InProgressCard } from "./components/InProgressCard";
import { loadEngine, resetEngine, summarizeBlog, isEngineReady } from "./llm";
import type { UrlEntry, ModelStatus } from "./types";
import {
  buildExportPayload,
  fetchContent,
  parseSummaryResult,
  resetEntryState,
} from "./appHelpers";
import "./App.css";

const DEFAULT_MODEL = "/model.litertlm";

let idCounter = 0;
const genId = () => `url-${++idCounter}`;

function App() {
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    state: "idle",
  });
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void handleLoadModel(modelFile);
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeModel = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    resetEngine();
    const objectUrl = URL.createObjectURL(file);
    setModelFile(file.name);
    void handleLoadModel(objectUrl);
    e.target.value = "";
  };

  const addUrl = useCallback((url: string) => {
    setUrls((prev) => [...prev, { id: genId(), url, status: "idle" }]);
  }, []);

  const removeUrl = useCallback((id: string) => {
    setUrls((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const clearUrls = useCallback(() => {
    setUrls([]);
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<UrlEntry>) => {
    setUrls((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!isEngineReady() || isRunning) {
      return;
    }

    abortRef.current = false;
    setIsRunning(true);

    setUrls((prev) => prev.map(resetEntryState));

    for (const entry of urls) {
      if (abortRef.current) {
        break;
      }

      const startTime = performance.now();
      const startTimestamp = Date.now();
      const getElapsed = () =>
        parseFloat(((performance.now() - startTime) / 1000).toFixed(1));

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

      if (abortRef.current) {
        break;
      }

      updateEntry(entry.id, { status: "streaming", streamText: "" });

      try {
        const generator = summarizeBlog(content);
        let accumulated = "";

        while (true) {
          const { value, done } = await generator.next();

          if (done) {
            const parsedResult = parseSummaryResult(value, accumulated);
            if (parsedResult) {
              updateEntry(entry.id, {
                status: "done",
                result: parsedResult,
                streamText: undefined,
                elapsedSeconds: getElapsed(),
              });
            } else {
              updateEntry(entry.id, {
                status: "error",
                error: "Failed to parse model response as JSON",
                elapsedSeconds: getElapsed(),
              });
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
    const exportResults = buildExportPayload(urls);
    if (exportResults.length === 0) {
      return;
    }

    const blob = new Blob([JSON.stringify(exportResults, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blog-summaries-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [urls]);

  const doneCount = urls.filter((entry) => entry.status === "done").length;
  const errorCount = urls.filter((entry) => entry.status === "error").length;
  const totalCount = urls.length;

  const inProgressEntry = urls.find(
    (entry) =>
      entry.status === "fetching" ||
      entry.status === "analyzing" ||
      entry.status === "streaming",
  );

  const completedEntries = urls.filter(
    (entry) => entry.status === "done" || entry.status === "error",
  );

  const hasStarted = urls.some((entry) => entry.status !== "idle");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-0 px-6 pb-20 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between gap-4 py-10">
        <div className="flex items-center gap-4">
          <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_0_24px_rgba(139,92,246,0.25)]">
            <Orbit size={24} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-[28px] font-semibold tracking-[-0.02em] text-transparent">
              BlogLens
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              On-device AI blog summarizer
            </p>
          </div>
        </div>
        {(doneCount > 0 || errorCount > 0) && (
          <div className="flex flex-shrink-0 gap-2">
            {doneCount > 0 && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-200">
                ✓ {doneCount} done
              </span>
            )}
            {errorCount > 0 && (
              <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-200">
                ✕ {errorCount} failed
              </span>
            )}
          </div>
        )}
      </header>

      <ModelBanner
        status={modelStatus}
        modelFile={modelFile}
        onChangeModel={handleChangeModel}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".litertlm"
        className="hidden"
        onChange={handleFileChange}
        id="model-file-input"
      />

      <div
        className={`grid gap-6 ${hasStarted ? "xl:grid-cols-[minmax(280px,1.2fr)_1.5fr_1.5fr]" : "grid-cols-1"}`}
      >
        <div className="min-w-0">
          <div className="mb-3.5 flex items-center gap-2">
            <span className="rounded border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 font-mono text-[11px] text-violet-300">
              01
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
              Add URLs
            </span>
            <span className="text-sm text-slate-500">Paste one or many</span>
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

        {hasStarted && (
          <div className="min-w-0">
            <div className="mb-3.5 flex items-center gap-2">
              <span className="rounded border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 font-mono text-[11px] text-violet-300">
                02
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
                In Progress
              </span>
              {inProgressEntry && (
                <span className="text-sm text-slate-500">● Live</span>
              )}
            </div>
            <div className="space-y-4">
              {inProgressEntry ? (
                <InProgressCard entry={inProgressEntry} />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-center text-sm text-slate-500 backdrop-blur-sm">
                  {isRunning ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="spinner" /> Processing…
                    </div>
                  ) : (
                    <span>No active job</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {hasStarted && (
          <div className="min-w-0">
            <div className="mb-3.5 flex flex-wrap items-center gap-2">
              <span className="rounded border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 font-mono text-[11px] text-violet-300">
                03
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
                Completed
              </span>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
                <span className="text-slate-200">{doneCount + errorCount}</span>
                <span>/</span>
                <span>{totalCount}</span>
              </span>
              {doneCount > 0 && (
                <button
                  id="export-json-btn"
                  className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={handleExportJson}
                  disabled={isRunning}
                  title="Export completed summaries to JSON"
                >
                  <Download size={12} strokeWidth={2.2} />
                  Export
                </button>
              )}
            </div>
            <div className="space-y-4" id="results-grid">
              {completedEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-500">
                  Results will appear here…
                </div>
              ) : (
                completedEntries.map((entry) => (
                  <UrlCard key={entry.id} entry={entry} />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-slate-500">
        <p>
          Powered by{" "}
          <strong className="font-semibold text-slate-300">LiteRT-LM</strong> ·
          Content via{" "}
          <strong className="font-semibold text-slate-300">Jina Reader</strong>{" "}
          · 100% on-device inference
        </p>
      </footer>
    </div>
  );
}

export default App;
