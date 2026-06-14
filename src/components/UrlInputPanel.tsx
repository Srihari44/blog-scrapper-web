import { m } from "framer-motion";
import { Link2, Sparkles, X } from "lucide-react";
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

  const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 shadow-[0_14px_40px_rgba(2,6,23,0.24)] backdrop-blur-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          >
            <Link2 size={16} strokeWidth={2} />
          </span>
          <input
            id="url-input"
            type="url"
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
            className="w-full rounded-xl border border-white/10 bg-slate-950/50 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {error && (
            <m.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 block text-sm text-rose-300"
            >
              {error}
            </m.span>
          )}
        </div>
        <m.button
          id="add-url-btn"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className={`${buttonBase} border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 disabled:hover:bg-violet-500/10`}
          onClick={handleAdd}
          disabled={isRunning || !input.trim()}
        >
          Add URL
        </m.button>
      </div>

      {urls.length > 0 && (
        <ul className="mt-4 space-y-2" id="url-list">
          {urls.map((entry) => {
            const statusClasses = {
              idle: "border-white/10 bg-white/[0.03] text-slate-300",
              fetching: "border-sky-400/20 bg-sky-500/10 text-sky-100",
              analyzing:
                "border-violet-400/20 bg-violet-500/10 text-violet-100",
              streaming: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
              done: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
              error: "border-rose-400/20 bg-rose-500/10 text-rose-100",
            };

            return (
              <m.li
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${statusClasses[entry.status] ?? statusClasses.idle}`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                <span className="min-w-0 flex-1 truncate" title={entry.url}>
                  {entry.url}
                </span>
                <span className="rounded-full border border-white/10 bg-black/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em]">
                  {entry.status}
                </span>
                {!isRunning && (
                  <m.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                    onClick={() => onRemove(entry.id)}
                    aria-label="Remove URL"
                  >
                    <X size={14} strokeWidth={2} />
                  </m.button>
                )}
              </m.li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {urls.length > 0 && (
          <m.button
            id="clear-btn"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className={`${buttonBase} border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10`}
            onClick={onClear}
            disabled={isRunning}
          >
            Clear All
          </m.button>
        )}
        <m.button
          id="analyze-btn"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className={`${buttonBase} flex-1 border-emerald-400/20 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25 disabled:hover:bg-emerald-500/15 sm:flex-none`}
          onClick={onAnalyze}
          disabled={isRunning || urls.length === 0 || !modelReady}
          title={!modelReady ? "Waiting for model to load…" : ""}
        >
          {isRunning ? (
            <>
              <span className="spinner" /> Analyzing…
            </>
          ) : (
            <>
              <Sparkles size={16} strokeWidth={2} />
              Summarize{" "}
              {urls.length > 0
                ? `${urls.length} URL${urls.length > 1 ? "s" : ""}`
                : ""}
            </>
          )}
        </m.button>
      </div>
    </m.div>
  );
}
