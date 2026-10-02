import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { m } from "framer-motion";
import { Download } from "lucide-react";
import { UrlInputPanel } from "./components/UrlInputPanel";
import { UrlCard } from "./components/UrlCard";
import { ModelBanner } from "./components/ModelBanner";
import { loadEngine, resetEngine, summarizeBlog, isEngineReady } from "./llm";
import type { UrlEntry, ModelStatus } from "./types";
import {
  buildExportPayload,
  fetchContent,
  isBlogAnalysis,
  normalizeBlogSummary,
  resetEntryState,
} from "./appHelpers";
import "./App.css";

let idCounter = 0;

const genId = () => `url-${++idCounter}`;

function App() {
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    state: "idle",
  });

  const [modelFile, setModelFile] = useState("");
  const [modelPathInput, setModelPathInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const urlsRef = useRef(urls);

  const abortRef = useRef(false);

  /*
   * Keep track of a locally selected .litertlm Blob URL so we can
   * revoke it when the model is replaced.
   */
  const modelObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    urlsRef.current = urls;
  }, [urls]);

  const handleLoadModel = useCallback(async (path: string) => {
    setModelStatus({
      state: "loading",
      progress: 0,
      message: "Starting…",
    });

    try {
      await loadEngine(path, (progress, message) => {
        setModelStatus({
          state: "loading",
          progress,
          message,
        });
      });

      setModelStatus({
        state: "ready",
      });
    } catch (err) {
      setModelStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Failed to load model",
      });
    }
  }, []);

  const handleChangeModel = useCallback(() => {
    /*
     * Don't allow replacing the model while an analysis batch
     * is running. This avoids disposing the engine while inference
     * is using it.
     */
    if (isRunning) {
      return;
    }

    fileInputRef.current?.click();
  }, [isRunning]);

  const handleSubmitModelPath = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      /*
       * Don't replace the engine during an active batch.
       */
      if (isRunning) {
        return;
      }

      const path = modelPathInput.trim();

      if (!path || modelStatus.state === "loading") {
        return;
      }

      setModelFile(path);

      void (async () => {
        /*
         * Fully release the old engine before loading the new one.
         */
        await resetEngine();

        await handleLoadModel(path);
      })();
    },
    [handleLoadModel, isRunning, modelPathInput, modelStatus.state],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      if (!file) {
        return;
      }

      /*
       * Don't replace the engine during an active batch.
       */
      if (isRunning) {
        e.target.value = "";
        return;
      }

      void (async () => {
        /*
         * Release the previous engine first.
         */
        await resetEngine();

        /*
         * Revoke the previous local model Blob URL.
         */
        if (modelObjectUrlRef.current) {
          URL.revokeObjectURL(modelObjectUrlRef.current);

          modelObjectUrlRef.current = null;
        }

        const objectUrl = URL.createObjectURL(file);

        modelObjectUrlRef.current = objectUrl;

        setModelFile(file.name);

        await handleLoadModel(objectUrl);
      })();

      /*
       * Allow selecting the same file again later.
       */
      e.target.value = "";
    },
    [handleLoadModel, isRunning],
  );

  /*
   * Release the engine and any local model Blob URL when the
   * React application is unmounted.
   */
  useEffect(() => {
    return () => {
      abortRef.current = true;

      void resetEngine();

      if (modelObjectUrlRef.current) {
        URL.revokeObjectURL(modelObjectUrlRef.current);

        modelObjectUrlRef.current = null;
      }
    };
  }, []);

  const addUrl = useCallback((url: string) => {
    setUrls((prev) => [
      ...prev,
      {
        id: genId(),
        url,
        status: "idle",
      },
    ]);
  }, []);

  const removeUrl = useCallback((id: string) => {
    setUrls((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const clearUrls = useCallback(() => {
    setUrls([]);
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<UrlEntry>) => {
    setUrls((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              ...patch,
            }
          : entry,
      ),
    );
  }, []);

  const processEntry = useCallback(
    async (entry: UrlEntry) => {
      const startTime = performance.now();
      const startTimestamp = Date.now();

      const getElapsed = () =>
        parseFloat(((performance.now() - startTime) / 1000).toFixed(1));

      updateEntry(entry.id, {
        status: "fetching",
        startTime: startTimestamp,
        error: undefined,
        result: undefined,
        elapsedSeconds: undefined,
      });

      let fetchedContent;

      try {
        fetchedContent = await fetchContent(entry.url);
      } catch (err) {
        updateEntry(entry.id, {
          status: "error",
          error:
            err instanceof Error ? err.message : "Failed to fetch content",
          elapsedSeconds: getElapsed(),
        });

        return;
      }

      if (abortRef.current) {
        return;
      }

      updateEntry(entry.id, {
        status: "analyzing",
      });

      try {
        const analysis = await summarizeBlog(fetchedContent.content);

        if (abortRef.current) {
          return;
        }

        if (!isBlogAnalysis(analysis)) {
          throw new Error("Model returned an invalid structured summary");
        }

        const finalResult = normalizeBlogSummary(
          analysis,
          fetchedContent.content,
          fetchedContent.title,
          fetchedContent.published_date,
        );

        updateEntry(entry.id, {
          status: "done",
          result: finalResult,
          elapsedSeconds: getElapsed(),
        });
      } catch (err) {
        updateEntry(entry.id, {
          status: "error",
          error: err instanceof Error ? err.message : "LLM error",
          elapsedSeconds: getElapsed(),
        });
      }
    },
    [updateEntry],
  );

  const handleRetry = useCallback(
    async (id: string) => {
      if (!isEngineReady() || isRunning) {
        return;
      }

      const entry = urlsRef.current.find((url) => url.id === id);

      if (!entry || entry.status !== "error") {
        return;
      }

      abortRef.current = false;
      setIsRunning(true);

      try {
        await processEntry(entry);
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning, processEntry],
  );

  const handleAnalyze = useCallback(async () => {
    if (!isEngineReady() || isRunning) {
      return;
    }

    abortRef.current = false;

    setIsRunning(true);

    /*
     * Reset all previous results before starting a new run.
     */
    setUrls((prev) => prev.map(resetEntryState));

    /*
     * Use a snapshot of the current URLs.
     *
     * This prevents the loop from being affected by state
     * updates caused by updateEntry().
     */
    const entriesToProcess = [...urlsRef.current];

    try {
      /*
       * IMPORTANT:
       *
       * Keep this loop sequential.
       *
       * We do NOT use Promise.all() because E4B inference is
       * resource-intensive and multiple simultaneous conversations
       * would dramatically increase WASM/WebGPU memory pressure.
       */
      for (const entry of entriesToProcess) {
        if (abortRef.current) {
          break;
        }

        await processEntry(entry);
      }
    } finally {
      /*
       * Always reset the running state, including unexpected
       * errors outside the per-URL try/catch blocks.
       */
      setIsRunning(false);
    }
  }, [isRunning, processEntry]);

  const handleExportJson = useCallback(() => {
    const exportResults = buildExportPayload(urlsRef.current);

    if (exportResults.length === 0) {
      return;
    }

    const blob = new Blob([JSON.stringify(exportResults, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `blog-summaries-${
      new Date().toISOString().split("T")[0]
    }.json`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, []);

  const { doneCount, errorCount, activeCount, pendingCount, completedEntries } =
    useMemo(() => {
      const doneCount = urls.filter((entry) => entry.status === "done").length;
      const errorCount = urls.filter((entry) => entry.status === "error").length;
      const activeCount = urls.filter(
        (entry) => entry.status === "fetching" || entry.status === "analyzing",
      ).length;
      const pendingCount = urls.filter((entry) => entry.status === "idle").length;
      const completedEntries = urls.filter(
        (entry) => entry.status === "done" || entry.status === "error",
      );

      return { doneCount, errorCount, activeCount, pendingCount, completedEntries };
    }, [urls]);

  useEffect(() => {
    if (resultsScrollRef.current && completedEntries.length > 0) {
      resultsScrollRef.current.scrollTop =
        resultsScrollRef.current.scrollHeight;
    }
  }, [completedEntries.length, isRunning]);

  const hasStarted = urls.some((entry) => entry.status !== "idle");

  const showModelOverlay = modelStatus.state !== "ready";

  return (
    <div
      className="relative min-h-screen bg-slate-950 text-slate-100"
      style={{
        backgroundImage:
          "radial-gradient(circle at top left, rgba(16,185,129,0.12), transparent 28%), radial-gradient(circle at bottom right, rgba(148,163,184,0.12), transparent 26%)",
      }}
    >
      {showModelOverlay && (
        <ModelBanner
          variant="overlay"
          status={modelStatus}
          modelFile={modelFile}
          modelPath={modelPathInput}
          onModelPathChange={setModelPathInput}
          onLoadModel={handleSubmitModelPath}
          onChangeModel={handleChangeModel}
        />
      )}

      <div
        inert={showModelOverlay}
        className="mx-auto flex min-h-[100dvh] w-full max-w-[1460px] flex-col px-4 pb-4 sm:px-6 sm:pb-5 lg:px-8 xl:h-[100dvh] xl:max-h-[100dvh] xl:overflow-hidden"
      >
        <m.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-white/10 py-5"
        >
          <div className="flex items-center gap-3">
            <m.div
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-sm font-semibold text-emerald-200"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.22, ease: "easeOut" }}
            >
              BL
            </m.div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                Research pipeline
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
                BlogLens
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <m.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12, duration: 0.22, ease: "easeOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              {modelStatus.state === "ready" ? "Ready" : "Model pending"}
            </m.span>
            {urls.length > 0 && (
              <m.p
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.16, duration: 0.22, ease: "easeOut" }}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-white/10 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-300"
                aria-label={`${doneCount} done, ${activeCount} processing, ${pendingCount} pending, ${errorCount} failed`}
                aria-live="polite"
              >
                <span>{doneCount} done</span>
                {activeCount > 0 && <span>{activeCount} processing</span>}
                <span>{pendingCount} pending</span>
                <span>{errorCount} failed</span>
              </m.p>
            )}
          </div>
        </m.header>

        <input
          ref={fileInputRef}
          type="file"
          accept=".litertlm"
          className="hidden"
          onChange={handleFileChange}
          id="model-file-input"
          disabled={isRunning}
        />

        <main
          className={`grid min-h-0 flex-1 gap-6 pt-6 ${
            hasStarted
              ? "xl:grid-cols-[minmax(300px,1.15fr)_1.6fr]"
              : "grid-cols-1"
          }`}
        >
          <m.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut", delay: 0.04 }}
            className="flex flex-col xl:min-h-0 xl:overflow-hidden"
          >
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Input queue
              </h2>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.9)] xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
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
          </m.section>

          {hasStarted && (
            <m.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.08 }}
              className="flex flex-col xl:min-h-0 xl:overflow-hidden"
            >
              <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Results
                </h2>

                {doneCount > 0 && (
                  <m.button
                    whileHover={{ y: -1, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    id="export-json-btn"
                    className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-200 transition hover:border-emerald-400/30 hover:bg-emerald-400/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                    onClick={handleExportJson}
                    title="Export completed summaries to JSON"
                  >
                    <Download size={12} strokeWidth={2.2} />
                    Export
                  </m.button>
                )}
              </div>

              <div
                ref={resultsScrollRef}
                className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-3 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.9)] xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1"
                id="results-grid"
              >
                {completedEntries.length === 0 ? (
                  <p className="py-6 text-sm text-slate-400">
                    Results will appear here…
                  </p>
                ) : (
                  completedEntries.map((entry) => (
                    <UrlCard
                      key={entry.id}
                      entry={entry}
                      onRetry={handleRetry}
                      retryDisabled={isRunning || modelStatus.state !== "ready"}
                    />
                  ))
                )}
              </div>
            </m.section>
          )}
        </main>

        <footer className="mt-4 shrink-0 border-t border-white/10 pt-3 text-center text-sm text-slate-400">
          Summaries run locally · URLs fetched via Jina Reader
        </footer>
      </div>
    </div>
  );
}

export default App;
