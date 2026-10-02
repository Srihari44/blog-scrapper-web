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
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 px-6 py-8"
      >
        <m.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="model-dialog-title"
          className="w-full max-w-md rounded-xl border border-white/15 bg-slate-900 p-5"
        >
          <div className="flex items-center gap-3">
            {status.state === "loading" ? (
              <div className="spinner-large" aria-hidden="true" />
            ) : (
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p
                id="model-dialog-title"
                className="text-sm font-semibold text-white"
              >
                {cfg.label}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {status.message ??
                  "A local model is required to summarize blogs."}
              </p>
            </div>
          </div>
          {status.state !== "loading" && (
            <form className="mt-6 space-y-3" onSubmit={onLoadModel}>
              <label
                htmlFor="model-path"
                className="block text-sm font-medium text-slate-200"
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
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />
              <p className="text-xs leading-5 text-slate-500">
                Enter a hosted model URL or a path served by this app, or choose
                a local .litertlm file.
              </p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!modelPath.trim()}
                  className="min-h-11 flex-1 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Load model
                </button>
                <button
                  type="button"
                  onClick={onChangeModel}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                >
                  <FileUp size={16} />
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
