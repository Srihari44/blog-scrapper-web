import React from "react";
import type { UrlEntry } from "../types";

interface UrlInputPanelProps {
  urls: UrlEntry[];
  onAdd: (url: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onAnalyze: () => void;
  isRunning: boolean;
  modelReady: boolean;
}

export function UrlInputPanel({
  urls,
  onAdd,
  onRemove,
  onClear,
  onAnalyze,
  isRunning,
  modelReady,
}: UrlInputPanelProps) {
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState("");

  const validateUrl = (u: string) => {
    try {
      new URL(u);
      return true;
    } catch {
      return false;
    }
  };

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!validateUrl(trimmed)) {
      setError("Please enter a valid URL");
      return;
    }
    if (urls.some((e) => e.url === trimmed)) {
      setError("URL already added");
      return;
    }
    setError("");
    onAdd(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    const lines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && validateUrl(l));
    if (lines.length > 1) {
      e.preventDefault();
      lines.forEach((u) => {
        if (!urls.some((entry) => entry.url === u)) onAdd(u);
      });
      setInput("");
    }
  };

  return (
    <div className="input-panel">
      <div className="input-row">
        <div className="input-wrapper">
          <span className="input-icon">🔗</span>
          <input
            id="url-input"
            type="url"
            placeholder="Paste blog URL here…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isRunning}
            autoComplete="off"
          />
          {error && <span className="input-error">{error}</span>}
        </div>
        <button
          id="add-url-btn"
          className="btn btn-add"
          onClick={handleAdd}
          disabled={isRunning || !input.trim()}
        >
          Add URL
        </button>
      </div>

      {urls.length > 0 && (
        <ul className="url-list" id="url-list">
          {urls.map((entry) => (
            <li key={entry.id} className={`url-item status-${entry.status}`}>
              <span className="url-status-dot" />
              <span className="url-text" title={entry.url}>
                {entry.url}
              </span>
              <span className={`url-badge badge-${entry.status}`}>
                {entry.status}
              </span>
              {!isRunning && (
                <button
                  className="url-remove"
                  onClick={() => onRemove(entry.id)}
                  aria-label="Remove URL"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="action-row">
        {urls.length > 0 && (
          <button
            id="clear-btn"
            className="btn btn-ghost"
            onClick={onClear}
            disabled={isRunning}
          >
            Clear All
          </button>
        )}
        <button
          id="analyze-btn"
          className="btn btn-primary"
          onClick={onAnalyze}
          disabled={isRunning || urls.length === 0 || !modelReady}
          title={!modelReady ? "Waiting for model to load…" : ""}
        >
          {isRunning ? (
            <>
              <span className="spinner" /> Analyzing…
            </>
          ) : (
            <>✨ Summarize {urls.length > 0 ? `${urls.length} URL${urls.length > 1 ? "s" : ""}` : ""}</>
          )}
        </button>
      </div>
    </div>
  );
}
