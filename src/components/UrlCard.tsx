import { useState, useEffect, type CSSProperties } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Clock3,
  CircleAlert,
  MessageCircle,
  Microscope,
  Newspaper,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { UrlEntry, BlogSummary, SentimentType } from "../types";

const SENTIMENT_CONFIG: Record<
  SentimentType,
  { label: string; color: string; icon: LucideIcon }
> = {
  tutorial: { label: "Tutorial", color: "#22d3ee", icon: BookOpen },
  opinion: { label: "Opinion", color: "#f472b6", icon: MessageCircle },
  news: { label: "News", color: "#fb923c", icon: Newspaper },
  reference: { label: "Reference", color: "#a78bfa", icon: BookOpen },
  "case-study": { label: "Case Study", color: "#4ade80", icon: Microscope },
};

function SentimentBadge({ sentiment }: { sentiment: SentimentType }) {
  const cfg = SENTIMENT_CONFIG[sentiment] ?? {
    label: sentiment,
    color: "#94a3b8",
    icon: Tag,
  };
  const Icon = cfg.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]"
      style={
        { color: cfg.color, borderColor: `${cfg.color}33` } as CSSProperties
      }
    >
      <Icon size={12} strokeWidth={2} />
      {cfg.label}
    </span>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function ReadTime({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
      <Clock3 size={14} strokeWidth={2} />
      {minutes} min read
    </span>
  );
}

function ResultCard({ result }: { result: BlogSummary }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-100">{result.title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <SentimentBadge sentiment={result.sentiment} />
          <ReadTime minutes={result.read_time_minutes} />
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-300">{result.summary}</p>
      <TagList tags={result.tags} />
    </div>
  );
}

function StreamPreview({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
        <span className="text-sm font-medium text-slate-200">Generating…</span>
      </div>
      <pre className="stream-text mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
        {text || " "}
      </pre>
    </div>
  );
}

interface UrlCardProps {
  entry: UrlEntry;
}

export function UrlCard({ entry }: UrlCardProps) {
  const [liveElapsed, setLiveElapsed] = useState<number | undefined>(undefined);

  useEffect(() => {
    const isActive = ["fetching", "analyzing", "streaming"].includes(
      entry.status,
    );
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
      }, 100);

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

  const statusLabel: Record<string, string> = {
    idle: "Queued",
    fetching: "Fetching content…",
    analyzing: "Processing…",
    streaming: "Generating summary…",
    done: "Complete",
    error: "Failed",
  };

  const pillClasses = {
    idle: "border-white/10 bg-white/[0.04] text-slate-300",
    fetching: "border-sky-400/20 bg-sky-500/10 text-sky-200",
    analyzing: "border-violet-400/20 bg-violet-500/10 text-violet-200",
    streaming: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    done: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    error: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  };

  return (
    <article
      className={`rounded-2xl border bg-white/[0.035] p-4 shadow-[0_14px_40px_rgba(2,6,23,0.24)] backdrop-blur-sm ${entry.status === "error" ? "border-rose-400/20" : entry.status === "done" ? "border-emerald-400/20" : "border-white/10"}`}
      id={`card-${entry.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 truncate text-sm font-medium text-slate-100 transition hover:text-violet-300"
        >
          {hostname}
          <ArrowUpRight size={10} strokeWidth={2.5} className="opacity-60" />
        </a>
        {displayedTime !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
            <Clock3 size={12} strokeWidth={2} />
            {displayedTime}s
          </span>
        )}
        <span
          className={`ml-auto inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${pillClasses[entry.status] ?? pillClasses.idle}`}
        >
          {entry.status === "fetching" ||
          entry.status === "streaming" ||
          entry.status === "analyzing" ? (
            <span className="spinner-sm" />
          ) : null}
          {statusLabel[entry.status]}
        </span>
      </div>

      <div className="mt-4">
        {(entry.status === "fetching" || entry.status === "analyzing") && (
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <div className="shimmer-line w-3/4" />
            <div className="shimmer-line w-full" />
            <div className="shimmer-line w-5/6" />
            <div className="shimmer-line mt-2 w-1/2" />
          </div>
        )}

        {entry.status === "streaming" && entry.streamText !== undefined && (
          <StreamPreview text={entry.streamText} />
        )}

        {entry.status === "done" && entry.result && (
          <ResultCard result={entry.result} />
        )}

        {entry.status === "error" && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">
            <CircleAlert size={20} strokeWidth={2} />
            <span>{entry.error ?? "Unknown error occurred"}</span>
          </div>
        )}
      </div>
    </article>
  );
}
