import { useState, useEffect } from "react";
import type { UrlEntry, BlogSummary, SentimentType } from "../types";

const SENTIMENT_CONFIG: Record<
  SentimentType,
  { label: string; color: string; icon: string }
> = {
  tutorial: { label: "Tutorial", color: "#22d3ee", icon: "📖" },
  opinion: { label: "Opinion", color: "#f472b6", icon: "💬" },
  news: { label: "News", color: "#fb923c", icon: "📰" },
  reference: { label: "Reference", color: "#a78bfa", icon: "📚" },
  "case-study": { label: "Case Study", color: "#4ade80", icon: "🔬" },
};

function SentimentBadge({ sentiment }: { sentiment: SentimentType }) {
  const cfg = SENTIMENT_CONFIG[sentiment] ?? {
    label: sentiment,
    color: "#94a3b8",
    icon: "🏷️",
  };
  return (
    <span
      className="sentiment-badge"
      style={{ "--sentiment-color": cfg.color } as React.CSSProperties}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="tag-list">
      {tags.map((tag) => (
        <span key={tag} className="tag">
          {tag}
        </span>
      ))}
    </div>
  );
}

function ReadTime({ minutes }: { minutes: number }) {
  return (
    <span className="read-time">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {minutes} min read
    </span>
  );
}

function ResultCard({ result }: { result: BlogSummary }) {
  return (
    <div className="result-card">
      <div className="result-header">
        <h3 className="result-title">{result.title}</h3>
        <div className="result-meta">
          <SentimentBadge sentiment={result.sentiment} />
          <ReadTime minutes={result.read_time_minutes} />
        </div>
      </div>
      <p className="result-summary">{result.summary}</p>
      <TagList tags={result.tags} />
    </div>
  );
}

function StreamPreview({ text }: { text: string }) {
  return (
    <div className="stream-preview">
      <div className="stream-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="stream-dot" />
          <span className="stream-label">Generating…</span>
        </div>
      </div>
      <pre className="stream-text">{text || " "}</pre>
    </div>
  );
}

interface UrlCardProps {
  entry: UrlEntry;
}

export function UrlCard({ entry }: UrlCardProps) {
  const [liveElapsed, setLiveElapsed] = useState<number | undefined>(undefined);

  useEffect(() => {
    const isActive = ["fetching", "analyzing", "streaming"].includes(entry.status);
    if (isActive && entry.startTime) {
      // Defer initial setState to prevent synchronous render cascading
      const timer = setTimeout(() => {
        setLiveElapsed(parseFloat(((Date.now() - entry.startTime!) / 1000).toFixed(1)));
      }, 0);

      const interval = setInterval(() => {
        setLiveElapsed(parseFloat(((Date.now() - entry.startTime!) / 1000).toFixed(1)));
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

  return (
    <article className={`url-card card-${entry.status}`} id={`card-${entry.id}`}>
      <div className="card-url-bar">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="card-url-text"
        >
          {hostname}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, opacity: 0.5 }}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
        {displayedTime !== undefined && (
          <span className="card-elapsed-time">⏱️ {displayedTime}s</span>
        )}
        <span className={`status-pill pill-${entry.status}`}>
          {entry.status === "fetching" || entry.status === "streaming" || entry.status === "analyzing" ? (
            <span className="spinner-sm" />
          ) : null}
          {statusLabel[entry.status]}
        </span>
      </div>

      <div className="card-body">
        {(entry.status === "fetching" || entry.status === "analyzing") && (
          <div className="card-placeholder">
            <div className="shimmer-line w-3/4" />
            <div className="shimmer-line w-full" />
            <div className="shimmer-line w-5/6" />
            <div className="shimmer-line w-1/2 mt-2" />
          </div>
        )}

        {entry.status === "streaming" && entry.streamText !== undefined && (
          <StreamPreview text={entry.streamText} />
        )}

        {entry.status === "done" && entry.result && (
          <ResultCard result={entry.result} />
        )}

        {entry.status === "error" && (
          <div className="card-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{entry.error ?? "Unknown error occurred"}</span>
          </div>
        )}
      </div>
    </article>
  );
}
