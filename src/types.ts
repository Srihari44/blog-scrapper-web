export type TContentType =
  | "tutorial"
  | "opinion"
  | "news"
  | "reference"
  | "case-study";

export interface BlogSummary {
  title: string;
  summary: string;
  read_time_minutes: number;
  tags: string[];
  content_type: TContentType;
}

export type BlogAnalysis = Pick<
  BlogSummary,
  "title" | "summary" | "tags" | "content_type"
>;

export interface FetchedContent {
  content: string;
  title?: string;
  finalUrl?: string;
}

export type UrlStatus =
  | "idle"
  | "fetching"
  | "analyzing"
  | "done"
  | "error";

export interface UrlEntry {
  id: string;
  url: string;
  status: UrlStatus;
  result?: BlogSummary;
  error?: string;
  elapsedSeconds?: number;
  startTime?: number;
}

export interface ModelStatus {
  state: "idle" | "loading" | "ready" | "error";
  progress?: number;
  message?: string;
}
