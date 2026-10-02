import { m } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  LoaderCircle,
  PauseCircle,
} from "lucide-react";
import type { FormEvent } from "react";
import type { ModelStatus } from "../types";

interface ModelBannerProps {
  status: ModelStatus;
  modelFile: string;
  modelPath: string;
  onModelPathChange: (path: string) => void;
  onLoadModel: (event: FormEvent<HTMLFormElement>) => void;
  onChangeModel: () => void;
  variant?: "inline" | "overlay";
}

export function ModelBanner({
  status,
  modelFile,
  modelPath,
  onModelPathChange,
  onLoadModel,
  onChangeModel,
  variant = "inline",
}: ModelBannerProps) {
  const stateConfig = {
    idle: {
      icon: PauseCircle,
      label: "Model not loaded",
      cardClass: "border-white/10 bg-white/[0.035]",
    },
    loading: {
      icon: LoaderCircle,
      label: "Loading model",
      cardClass: "border-emerald-400/30 bg-emerald-500/10",
    },
    ready: {
      icon: CheckCircle2,
      label: "Model ready",
      cardClass: "border-emerald-400/25 bg-emerald-500/8",
    },
    error: {
      icon: AlertCircle,
      label: "Could not load model",
      cardClass: "border-rose-400/25 bg-rose-500/8",
    },
  };

  const cfg = stateConfig[status.state];
  const Icon = cfg.icon;

  if (variant === "overlay" && status.state !== "ready") {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 py-8 backdrop-blur-sm"
      >
        <m.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="model-dialog-title"
          className="w-full max-w-xl rounded-[28px] border border-slate-700/80 bg-slate-900/90 p-6 shadow-[0_28px_60px_-30px_rgba(15,23,42,1)]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-slate-100">
              {status.state === "loading" ? (
                <div className="spinner-large" aria-hidden="true" />
              ) : (
                <Icon size={20} strokeWidth={2} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p
                id="model-dialog-title"
                className="text-4xl font-semibold tracking-tight text-slate-50"
              >
                {cfg.label}
              </p>
              <p className="mt-3 text-base leading-7 text-slate-300">
                {status.message ??
                  "A local model is required to summarize blogs."}
              </p>
            </div>
          </div>
          {status.state !== "loading" && (
            <form className="mt-7 space-y-4" onSubmit={onLoadModel}>
              <div>
                <label
                  htmlFor="model-path"
                  className="mb-2 block text-base font-medium text-slate-200"
                >
                  Model URL or path
                </label>
                <input
                  id="model-path"
                  type="text"
                  value={modelPath}
                  autoFocus
                  onChange={(event) => onModelPathChange(event.target.value)}
                  placeholder="/model.litertlm or https://…"
                  autoComplete="url"
                  required
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3.5 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
              <p className="text-sm leading-6 text-slate-400">
                Enter a hosted model URL or a path served by this app, or choose
                a local .litertlm file.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!modelPath.trim()}
                  className="min-h-12 flex-1 rounded-2xl bg-emerald-400 px-4 py-3 text-lg font-semibold text-slate-950 shadow-[0_18px_30px_-18px_rgba(52,211,153,0.9)] transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Load model
                </button>
                <button
                  type="button"
                  onClick={onChangeModel}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-base font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                >
                  <FileUp size={18} />
                  Browse
                </button>
              </div>
            </form>
          )}
        </m.div>
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative w-full rounded-lg border px-4 py-3 ${cfg.cardClass}`}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 items-center justify-center text-slate-100"
          aria-hidden="true"
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-100">
            {cfg.label}
          </span>
          <span
            className="block truncate font-mono text-xs text-slate-400"
            title={modelFile}
          >
            {modelFile.split(/[\\/]/).pop() ?? modelFile}
          </span>
        </div>
      </div>
    </m.div>
  );
}
