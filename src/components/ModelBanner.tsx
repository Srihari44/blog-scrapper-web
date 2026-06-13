import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  LoaderCircle,
  PauseCircle,
  RefreshCw,
} from "lucide-react";
import type { ModelStatus } from "../types";

interface ModelBannerProps {
  status: ModelStatus;
  modelFile: string;
  onChangeModel: () => void;
}

export function ModelBanner({
  status,
  modelFile,
  onChangeModel,
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

  return (
    <div
      className={`relative mb-8 overflow-hidden rounded-2xl border px-4 py-3.5 backdrop-blur-sm ${cfg.cardClass}`}
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
        {status.state === "loading" && status.progress !== undefined && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
            <div
              className="h-full rounded-r-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-300"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        )}
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onChangeModel}
          disabled={status.state === "loading"}
          title="Change model file"
        >
          {status.state === "ready" ? (
            <RefreshCw size={14} strokeWidth={2} />
          ) : (
            <FolderOpen size={14} strokeWidth={2} />
          )}
          <span>Change</span>
        </button>
      </div>
    </div>
  );
}
