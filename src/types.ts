export type SentimentType = "tutorial" | "opinion" | "news" | "reference" | "case-study";

export interface BlogSummary {
  title: string;
  summary: string;
  read_time_minutes: number;
  tags: string[];
  sentiment: SentimentType;
}

export type UrlStatus = "idle" | "fetching" | "analyzing" | "streaming" | "done" | "error";

export interface UrlEntry {
  id: string;
  url: string;
  status: UrlStatus;
  result?: BlogSummary;
  error?: string;
  streamText?: string;
  elapsedSeconds?: number;
  startTime?: number;
}

export interface ModelStatus {
  state: "idle" | "loading" | "ready" | "error";
  progress?: number;
  message?: string;
}
