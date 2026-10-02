import { X } from "lucide-react";
import type { UrlEntry } from "../types";
import { useState } from "react";

interface UrlInputPanelProps {
  urls: UrlEntry[];
  onAdd: (url: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onAnalyze: () => void;
  isRunning: boolean;
  modelReady: boolean;
}

export function UrlInputPanel({
  urls,
  onAdd,
  onRemove,
  onClear,
  onAnalyze,
  isRunning,
  modelReady,
}: UrlInputPanelProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const validateUrl = (u: string) => {
    try {
      new URL(u);
      return true;
    } catch {
      return false;
    }
  };

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!validateUrl(trimmed)) {
      setError("Please enter a valid URL");
      return;
    }
    if (urls.some((e) => e.url === trimmed)) {
      setError("URL already added");
      return;
    }
    setError("");
    onAdd(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    const lines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && validateUrl(l));
    if (lines.length > 1) {
      e.preventDefault();
      lines.forEach((u) => {
        if (!urls.some((entry) => entry.url === u)) onAdd(u);
      });
      setInput("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <input
            id="url-input"
            type="url"
            aria-label="Blog URL"
            placeholder="Paste blog URL here…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isRunning}
            autoComplete="off"
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {error && (
            <span className="mt-2 block text-sm text-rose-300" role="alert">
              {error}
            </span>
          )}
        </div>
        <button
          type="button"
          id="add-url-btn"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={handleAdd}
          disabled={isRunning || !input.trim()}
        >
          Add URL
        </button>
      </div>

      {urls.length > 0 && (
        <ul className="divide-y divide-white/10" id="url-list">
          {urls.map((entry) => {
            return (
              <li
                key={entry.id}
                className="flex items-center gap-3 py-3 text-sm"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    entry.status === "error"
                      ? "bg-rose-400"
                      : entry.status === "done"
                        ? "bg-emerald-400"
                        : entry.status === "fetching" ||
                            entry.status === "analyzing"
                          ? "bg-amber-300"
                          : "bg-slate-500"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate" title={entry.url}>
                  {entry.url}
                </span>
                <span className="shrink-0 text-sm capitalize text-slate-400">
                  {entry.status}
                </span>
                {!isRunning &&
                  entry.status !== "done" &&
                  entry.status !== "error" && (
                    <button
                      type="button"
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-400"
                      onClick={() => onRemove(entry.id)}
                      aria-label={`Remove ${entry.url}`}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {urls.length > 0 && (
          <button
            type="button"
            id="clear-btn"
            className="min-h-11 px-2 text-sm text-slate-400 underline-offset-4 hover:text-slate-100 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onClear}
            disabled={isRunning}
          >
            Clear All
          </button>
        )}
        <button
          type="button"
          id="analyze-btn"
          className="ml-auto inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300/40 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onAnalyze}
          disabled={isRunning || urls.length === 0 || !modelReady}
          title={!modelReady ? "Waiting for model to load…" : ""}
        >
          {isRunning ? (
            <>
              <span className="spinner" aria-hidden="true" /> Summarizing…
            </>
          ) : (
            `Summarize ${urls.length} URL${urls.length === 1 ? "" : "s"}`
          )}
        </button>
      </div>
    </div>
  );
}
