import type { BlogSummary, UrlEntry } from "./types";

export async function fetchContent(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const res = await fetch(jinaUrl, {
    headers: { Accept: "text/plain" },
  });

  if (!res.ok) {
    throw new Error(`Jina fetch failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  if (!text || text.trim().length < 50) {
    throw new Error("Fetched content is too short or empty");
  }

  return text;
}

export function isBlogSummary(value: unknown): value is BlogSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const summary = value as Record<string, unknown>;
  return (
    typeof summary.title === "string" &&
    typeof summary.summary === "string" &&
    typeof summary.read_time_minutes === "number" &&
    Array.isArray(summary.tags) &&
    typeof summary.sentiment === "string"
  );
}

export function parseSummaryResult(
  value: unknown,
  accumulated: string,
): BlogSummary | null {
  if (isBlogSummary(value)) {
    return value;
  }

  const cleaned = accumulated
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return isBlogSummary(parsed) ? parsed : null;
  } catch {
    const match = accumulated.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      const parsed = JSON.parse(match[0]);
      return isBlogSummary(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

export function buildExportPayload(entries: UrlEntry[]) {
  return entries
    .filter((entry) => entry.status === "done" && entry.result)
    .map((entry) => ({
      url: entry.url,
      title: entry.result?.title,
      summary: entry.result?.summary,
      read_time_minutes: entry.result?.read_time_minutes,
      tags: entry.result?.tags,
      sentiment: entry.result?.sentiment,
      elapsed_seconds: entry.elapsedSeconds,
    }));
}

export function resetEntryState(entry: UrlEntry): UrlEntry {
  return {
    ...entry,
    status: "idle",
    result: undefined,
    error: undefined,
    streamText: undefined,
    elapsedSeconds: undefined,
    startTime: undefined,
  };
}
