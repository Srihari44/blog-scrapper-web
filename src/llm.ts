import type { BlogSummary } from "./types";

// LiteRT-LM Engine singleton
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let engine: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let EngineClass: any = null;

export type ProgressCallback = (progress: number, message: string) => void;

export function resetEngine(): void {
  engine = null;
  EngineClass = null;
}

export async function loadEngine(
  modelPath: string,
  onProgress?: ProgressCallback
): Promise<void> {
  if (engine) return;

  onProgress?.(0, "Importing LiteRT-LM…");

  // Dynamic import so it doesn't block initial render
  const mod = await import("@litert-lm/core");
  EngineClass = mod.Engine;

  onProgress?.(10, "Initialising engine…");

  engine = await EngineClass.create({
    model: modelPath,
    mainExecutorSettings: {
      maxNumTokens: 4096,
    },
    onProgress: (p: number) => {
      onProgress?.(10 + Math.round(p * 85), `Loading model… ${Math.round(p * 100)}%`);
    },
  });

  onProgress?.(100, "Model ready");
}

export function isEngineReady(): boolean {
  return engine !== null;
}

const SYSTEM_PROMPT = `You are a blog analysis assistant. When given the text content of a blog post, you must respond with ONLY a valid JSON object (no markdown, no explanation, no code fences) that matches this exact schema:

{
  "title": string,
  "summary": string,         // 2–3 sentence summary
  "read_time_minutes": number, // estimated reading time
  "tags": string[],           // 3–6 relevant tags
  "sentiment": "tutorial" | "opinion" | "news" | "reference" | "case-study"
}

Respond with ONLY the raw JSON object. Do not wrap it in \`\`\`json or anything else.`;

export async function* summarizeBlog(
  content: string
): AsyncGenerator<string, BlogSummary, unknown> {
  if (!engine) throw new Error("Engine not loaded");

  const chat = await engine.createConversation({
    preface: {
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
    },
  });

  // Truncate content to avoid token limits (roughly 6000 chars ≈ ~1500 tokens)
  const truncated = content.length > 6000 ? content.slice(0, 6000) + "\n\n[content truncated]" : content;

  let accumulated = "";

  for await (const chunk of chat.sendMessageStreaming(
    `Analyze this blog post:\n\n${truncated}`
  )) {
    const text: string = chunk.content?.[0]?.text ?? "";
    accumulated += text;
    yield text;
  }

  // Parse the JSON from accumulated text
  // Strip any accidental markdown code fences
  const cleaned = accumulated
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as BlogSummary;
  } catch {
    // Attempt to extract JSON object from the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as BlogSummary;
    }
    throw new Error("Failed to parse model response as JSON");
  }
}
