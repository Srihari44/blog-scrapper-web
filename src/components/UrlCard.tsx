import { useState, useEffect, type CSSProperties } from "react";
import { m } from "framer-motion";
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
import type { UrlEntry, BlogSummary, TContentType } from "../types";

const CONTENT_TYPE_CONFIG: Record<
  TContentType,
  { label: string; color: string; icon: LucideIcon }
> = {
  tutorial: { label: "Tutorial", color: "#22d3ee", icon: BookOpen },
  opinion: { label: "Opinion", color: "#f472b6", icon: MessageCircle },
  news: { label: "News", color: "#fb923c", icon: Newspaper },
  reference: { label: "Reference", color: "#a78bfa", icon: BookOpen },
  "case-study": { label: "Case Study", color: "#4ade80", icon: Microscope },
};

function ContentTypeBadge({ content_type }: { content_type: TContentType }) {
  const cfg = CONTENT_TYPE_CONFIG[content_type] ?? {
    label: content_type,
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
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-100">{result.title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <ContentTypeBadge content_type={result.content_type} />
          <ReadTime minutes={result.read_time_minutes} />
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-300">{result.summary}</p>
      <TagList tags={result.tags} />
    </m.div>
  );
}

interface UrlCardProps {
  entry: UrlEntry;
}

export function UrlCard({ entry }: UrlCardProps) {
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

  return (
    <m.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      whileHover={{ y: -2, scale: 1.005 }}
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
      </div>

      <div className="mt-4">
        {(entry.status === "fetching" || entry.status === "analyzing") && (
          <m.div
            key="loading"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
          >
            <div className="shimmer-line w-3/4" />
            <div className="shimmer-line w-full" />
            <div className="shimmer-line w-5/6" />
            <div className="shimmer-line mt-2 w-1/2" />
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
            className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200"
          >
            <CircleAlert size={20} strokeWidth={2} />
            <span>{entry.error ?? "Unknown error occurred"}</span>
          </m.div>
        )}
      </div>
    </m.article>
  );
}
