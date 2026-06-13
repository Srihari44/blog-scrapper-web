import type { ModelStatus } from "../types";

interface ModelBannerProps {
  status: ModelStatus;
  modelFile: string;
  onChangeModel: () => void;
}

export function ModelBanner({ status, modelFile, onChangeModel }: ModelBannerProps) {
  const stateConfig = {
    idle: { icon: "⏸️", label: "Model not loaded", cls: "banner-idle" },
    loading: { icon: "⚙️", label: status.message ?? "Loading model…", cls: "banner-loading" },
    ready: { icon: "✅", label: "Model ready", cls: "banner-ready" },
    error: { icon: "❌", label: status.message ?? "Model error", cls: "banner-error" },
  };

  const cfg = stateConfig[status.state];

  return (
    <div className={`model-banner ${cfg.cls}`}>
      <span className="banner-icon">{cfg.icon}</span>
      <div className="banner-content">
        <span className="banner-label">{cfg.label}</span>
        <span className="banner-file" title={modelFile}>
          {modelFile.split("/").pop() ?? modelFile}
        </span>
      </div>
      {status.state === "loading" && status.progress !== undefined && (
        <div className="banner-progress">
          <div
            className="banner-progress-bar"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      )}
      <button
        className="banner-change"
        onClick={onChangeModel}
        disabled={status.state === "loading"}
        title="Change model file"
      >
        {status.state === "ready" ? "🔄" : "📂"} Change
      </button>
    </div>
  );
}
