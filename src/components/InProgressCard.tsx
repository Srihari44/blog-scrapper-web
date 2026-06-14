import { m } from "framer-motion";
import type { UrlEntry } from "../types";

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
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_14px_40px_rgba(2,6,23,0.24)] backdrop-blur-sm"
    >
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
          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
          >
            <div className="shimmer-line w-3/4" />
            <div className="shimmer-line w-full" />
            <div className="shimmer-line w-5/6" />
            <div className="shimmer-line mt-2 w-1/2" />
          </m.div>
        ) : entry.streamText !== undefined ? (
          <m.pre
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="stream-text whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm leading-7 text-slate-300"
          >
            {entry.streamText || " "}
          </m.pre>
        ) : null}
      </div>
    </m.div>
  );
}
