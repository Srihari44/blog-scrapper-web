import { useState, useEffect } from "react";
import { m } from "framer-motion";
import {
  ArrowUpRight,
  Clock3,
  CircleAlert,
  RotateCcw,
} from "lucide-react";
import type { UrlEntry, BlogSummary } from "../types";

function ResultCard({ result }: { result: BlogSummary }) {
  const contentType = result.content_type.replace("-", " ");

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <h3 className="break-words text-lg font-semibold text-slate-100">
        {result.title}
      </h3>

      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
        {result.summary}
      </p>

      <p className="mt-3 text-sm text-slate-400">
        {contentType} · {result.read_time_minutes} min read
        {result.published_date && ` · ${result.published_date}`}
      </p>

      {result.tags.length > 0 && (
        <p className="mt-1 break-words text-sm text-slate-400">
          Topics: {result.tags.join(" · ")}
        </p>
      )}
    </m.div>
  );
}

interface UrlCardProps {
  entry: UrlEntry;
  onRetry: (id: string) => void;
  retryDisabled: boolean;
}

export function UrlCard({ entry, onRetry, retryDisabled }: UrlCardProps) {
  const [liveElapsed, setLiveElapsed] = useState<number | undefined>(undefined);

  useEffect(() => {
    const isActive = ["fetching", "analyzing"].includes(entry.status);

    if (isActive && entry.startTime) {
      const timer = setTimeout(() => {
        setLiveElapsed(
          parseFloat(((Date.now() - entry.startTime!) / 1000).toFixed(1)),
        );
      }, 0);

      const interval = setInterval(() => {
        setLiveElapsed(
          parseFloat(((Date.now() - entry.startTime!) / 1000).toFixed(1)),
        );
      }, 250);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
        setLiveElapsed(undefined);
      };
    }
  }, [entry.status, entry.startTime]);

  const displayedTime = entry.elapsedSeconds ?? liveElapsed;

  const hostname = (() => {
    try {
      return new URL(entry.url).hostname;
    } catch {
      return entry.url;
    }
  })();

  return (
    <m.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="border-b border-white/10 pb-5"
      id={`card-${entry.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 truncate text-sm font-medium text-slate-100 transition hover:text-emerald-300 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          {hostname}

          <ArrowUpRight size={10} strokeWidth={2.5} className="opacity-60" />
        </a>

        {displayedTime !== undefined && (
          <span className="inline-flex items-center gap-1 text-sm text-slate-400">
            <Clock3 size={12} strokeWidth={2} aria-hidden="true" />
            {displayedTime}s
          </span>
        )}
      </div>

      <div className="mt-3">
        {(entry.status === "fetching" || entry.status === "analyzing") && (
          <m.div
            key="loading"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 py-2"
            role="status"
            aria-label={
              entry.status === "fetching"
                ? "Fetching article"
                : "Summarizing article"
            }
          >
            <span className="sr-only">
              {entry.status === "fetching"
                ? "Fetching article…"
                : "Summarizing article…"}
            </span>
            <div className="h-3 w-3/4 rounded bg-white/10" />
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-5/6 rounded bg-white/10" />
          </m.div>
        )}

        {entry.status === "done" && entry.result && (
          <m.div
            key="result"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ResultCard result={entry.result} />
          </m.div>
        )}

        {entry.status === "error" && (
          <m.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between gap-3 text-sm text-rose-200"
          >
            <span className="flex min-w-0 items-start gap-2">
              <CircleAlert size={20} strokeWidth={2} className="shrink-0" />
              <span>{entry.error ?? "Unknown error occurred"}</span>
            </span>
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-rose-300/20 px-3 text-sm font-medium text-rose-100 transition hover:bg-rose-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onRetry(entry.id)}
              disabled={retryDisabled}
              title="Retry URL"
            >
              <RotateCcw size={13} strokeWidth={2} />
              Retry
            </button>
          </m.div>
        )}
      </div>
    </m.article>
  );
}
