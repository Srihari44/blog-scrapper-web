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
      label: status.message ?? "Loading model…",
      cardClass: "border-violet-400/30 bg-violet-500/10",
    },
    ready: {
      icon: CheckCircle2,
      label: "Model ready",
      cardClass: "border-emerald-400/25 bg-emerald-500/8",
    },
    error: {
      icon: AlertCircle,
      label: status.message ?? "Model error",
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-6 py-8 backdrop-blur-xl"
      >
        <m.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900/85 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)]"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950/70 text-slate-100">
              {status.state === "loading" ? (
                <div className="spinner-large" aria-hidden="true" />
              ) : (
                <Icon size={24} strokeWidth={2} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{cfg.label}</p>
              <p className="mt-1 text-sm text-slate-400">
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
                onChange={(event) => onModelPathChange(event.target.value)}
                placeholder="/model.litertlm or https://…"
                autoComplete="url"
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
              />
              <p className="text-xs leading-5 text-slate-500">
                Enter a hosted model URL or a path served by this app, or choose
                a local .litertlm file.
              </p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!modelPath.trim()}
                  className="flex-1 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Load model
                </button>
                <button
                  type="button"
                  onClick={onChangeModel}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
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
      className={`relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 backdrop-blur-sm ${cfg.cardClass}`}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950/50 text-slate-100"
          aria-hidden="true"
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-100">
            {cfg.label}
          </span>
          <span
            className="block truncate font-mono text-[11px] text-slate-500"
            title={modelFile}
          >
            {modelFile.split("/").pop() ?? modelFile}
          </span>
        </div>
      </div>
    </m.div>
  );
}
