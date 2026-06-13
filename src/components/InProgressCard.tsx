import type { UrlEntry, UrlStatus } from "../types";

const STATUS_LABELS: Record<UrlStatus, string> = {
  fetching: "Fetching content…",
  analyzing: "Processing…",
  streaming: "Generating summary…",
  idle: "Idle",
  done: "Done",
  error: "Error",
};

const PILL_CLASSES: Record<UrlStatus, string> = {
  fetching: "border-sky-400/20 bg-sky-500/10 text-sky-200",
  analyzing: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  streaming: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  idle: "border-white/10 bg-white/[0.04] text-slate-300",
  done: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  error: "border-rose-400/20 bg-rose-500/10 text-rose-200",
};

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function InProgressCard({ entry }: { entry: UrlEntry }) {
  const hostname = getHostname(entry.url);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_14px_40px_rgba(2,6,23,0.24)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <img
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
          alt=""
          width={16}
          height={16}
          onError={(e) => (e.currentTarget.style.display = "none")}
          className="rounded-[3px]"
        />
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm font-medium text-slate-100 transition hover:text-violet-300"
        >
          {hostname}
        </a>
      </div>
      <div className="mt-4">
        {entry.status === "fetching" || entry.status === "analyzing" ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <div className="shimmer-line w-3/4" />
            <div className="shimmer-line w-full" />
            <div className="shimmer-line w-5/6" />
            <div className="shimmer-line mt-2 w-1/2" />
          </div>
        ) : entry.streamText !== undefined ? (
          <pre className="stream-text whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm leading-7 text-slate-300">
            {entry.streamText || " "}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
