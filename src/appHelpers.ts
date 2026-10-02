import type {
  BlogAnalysis,
  BlogSummary,
  TContentType,
  FetchedContent,
  UrlEntry,
} from "./types";

const CONTENT_TYPES: TContentType[] = [
  "tutorial",
  "opinion",
  "news",
  "reference",
  "case-study",
];

const ERROR_INDICATORS = [
  "404 not found",
  "page not found",
  "404 error",
  "access denied",
  "403 forbidden",
  "request forbidden",
  "something went wrong",
  "this page doesn't exist",
  "this page does not exist",
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractTitle(content: string): string | undefined {
  // Jina commonly returns a markdown H1 near the beginning.
  const headingMatch = content.match(/^#\s+(.+)$/m);

  if (headingMatch?.[1]) {
    return normalizeWhitespace(headingMatch[1]);
  }

  return undefined;
}

function looksLikeErrorPage(content: string): boolean {
  const normalized = content.toLowerCase().replace(/\s+/g, " ");

  return ERROR_INDICATORS.some((indicator) => normalized.includes(indicator));
}

export async function fetchContent(url: string): Promise<FetchedContent> {
  const jinaUrl = `https://r.jina.ai/${url}`;

  const res = await fetch(jinaUrl, {
    headers: {
      Accept: "text/plain",
    },
  });

  if (!res.ok) {
    throw new Error(`Jina fetch failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const content = text.trim();

  if (content.length < 200) {
    throw new Error("Fetched content is too short or empty");
  }

  if (looksLikeErrorPage(content)) {
    throw new Error("The source appears to be an error, 404, or blocked page");
  }

  return {
    content,
    title: extractTitle(content),
    finalUrl: url,
  };
}

/**
 * Calculate reading time from the actual article content.
 * 200 WPM is a reasonable default for technical articles.
 */
export function calculateReadTime(content: string): number {
  const cleanContent = content
    // Remove fenced code blocks from reading-time calculation.
    .replace(/```[\s\S]*?```/g, " ")
    // Remove markdown links but keep their text.
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove markdown syntax.
    .replace(/[#*_>`~]/g, " ");

  const words = cleanContent.split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 200));
}

function normalizeTag(tag: string): string {
  return normalizeWhitespace(tag);
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalized = tags
    .filter((tag): tag is string => typeof tag === "string")
    .map(normalizeTag)
    .filter(Boolean);

  return [...new Set(normalized)].slice(0, 6);
}

function isContentType(value: unknown): value is TContentType {
  return (
    typeof value === "string" && CONTENT_TYPES.includes(value as TContentType)
  );
}

export function isBlogAnalysis(value: unknown): value is BlogAnalysis {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const summary = value as Record<string, unknown>;

  return (
    typeof summary.title === "string" &&
    summary.title.trim().length >= 3 &&
    typeof summary.summary === "string" &&
    summary.summary.trim().length >= 20 &&
    Array.isArray(summary.tags) &&
    summary.tags.length >= 1 &&
    summary.tags.length <= 6 &&
    summary.tags.every(
      (tag) => typeof tag === "string" && tag.trim().length > 0,
    ) &&
    isContentType(summary.content_type)
  );
}

export function normalizeBlogSummary(
  value: BlogAnalysis,
  content: string,
  sourceTitle?: string,
): BlogSummary {
  return {
    title: sourceTitle?.trim() || value.title.trim(),
    summary: normalizeWhitespace(value.summary),
    read_time_minutes: calculateReadTime(content),
    tags: normalizeTags(value.tags),
    content_type: value.content_type,
  };
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
      content_type: entry.result?.content_type,
      elapsed_seconds: entry.elapsedSeconds,
    }));
}

export function resetEntryState(entry: UrlEntry): UrlEntry {
  return {
    ...entry,
    status: "idle",
    result: undefined,
    error: undefined,
    elapsedSeconds: undefined,
    startTime: undefined,
  };
}
