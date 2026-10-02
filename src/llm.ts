import type { FunctionDeclaration, Tool } from "@litert-lm/core";

/*
 * Keep the input comfortably below the 4096-token context limit.
 *
 * 10,000 characters is roughly ~2,500 tokens for typical English text,
 * leaving room for the system prompt, tool schema, and generated output.
 */
const MAX_INPUT_CHARS = 10_000;

function prepareContentForModel(content: string): string {
  if (content.length <= MAX_INPUT_CHARS) {
    return content;
  }

  const headLength = 8_000;
  const tailLength = 2_000;

  return [
    content.slice(0, headLength),
    "\n\n[Middle of article omitted for context limits]\n\n",
    content.slice(-tailLength),
  ].join("");
}

// LiteRT-LM Engine singleton
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let engine: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let EngineClass: any = null;

export type ProgressCallback = (
  progress: number,
  message: string,
) => void;

/**
 * Fully release the current LiteRT-LM engine.
 *
 * This is important because simply setting engine = null does not
 * deterministically release the underlying WASM/WebGPU resources.
 */
export async function resetEngine(): Promise<void> {
  const currentEngine = engine;

  // Clear references first so a concurrent caller cannot accidentally
  // reuse the engine while it is being disposed.
  engine = null;
  EngineClass = null;

  if (currentEngine) {
    try {
      await currentEngine.delete();
    } catch (error) {
      console.warn("Failed to delete LiteRT-LM engine:", error);
    }
  }
}

export async function loadEngine(
  modelPath: string,
  onProgress?: ProgressCallback,
): Promise<void> {
  if (engine) {
    return;
  }

  onProgress?.(0, "Importing LiteRT-LM…");

  const mod = await import("@litert-lm/core");

  EngineClass = mod.Engine;

  onProgress?.(10, "Initialising engine…");

  engine = await EngineClass.create({
    model: modelPath,

    mainExecutorSettings: {
      /*
       * Your previous 16,384 setting is unnecessary for this app.
       *
       * You previously hit:
       *   27863 >= 4096
       *
       * so keep the runtime context at 4096 and constrain the article
       * input separately in prepareContentForModel().
       */
      maxNumTokens: 8192,
    },

    onProgress: (p: number) => {
      onProgress?.(
        10 + Math.round(p * 85),
        `Loading model… ${Math.round(p * 100)}%`,
      );
    },
  });

  onProgress?.(100, "Model ready");
}

export function isEngineReady(): boolean {
  return engine !== null;
}

const SUMMARY_TOOL_NAME = "submit_blog_summary";

const SUMMARY_FUNCTION: FunctionDeclaration = {
  name: SUMMARY_TOOL_NAME,
  description: "Return a structured analysis of the provided blog article.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The article title, kept concise and faithful to the source.",
      },

      summary: {
        type: "string",
        description: "A concise summary in 2–3 sentences.",
      },

      tags: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          'Specific article topics; avoid generic tags like "Technology".',
      },

      content_type: {
        type: "string",
        enum: [
          "tutorial",
          "opinion",
          "news",
          "reference",
          "case-study",
        ],
        description: "The type of content, not its emotional tone.",
      },
    },

    required: [
      "title",
      "summary",
      "tags",
      "content_type",
    ],
  },
};

// Gemma 4's chat template reads function declarations from tool.function.
const SUMMARY_TOOL: Tool = {
  type: "function",
  function: SUMMARY_FUNCTION,
};

function getResponseText(response: unknown): string | undefined {
  if (typeof response === "string") {
    return response;
  }

  if (typeof response !== "object" || response === null) {
    return undefined;
  }

  const content = (response as { content?: unknown }).content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const textParts = content.flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const text = (item as { text?: unknown }).text;

      return typeof text === "string"
        ? [text]
        : [];
    });

    return textParts.length > 0
      ? textParts.join("")
      : undefined;
  }

  return undefined;
}

function findSummaryToolArguments(
  response: unknown,
): unknown | undefined {
  if (
    typeof response !== "object" ||
    response === null
  ) {
    return undefined;
  }

  const toolCalls = (
    response as { tool_calls?: unknown }
  ).tool_calls;

  if (!Array.isArray(toolCalls)) {
    return undefined;
  }

  for (const call of toolCalls) {
    if (
      typeof call !== "object" ||
      call === null
    ) {
      continue;
    }

    const functionCall = (
      call as { function?: unknown }
    ).function;

    if (
      typeof functionCall !== "object" ||
      functionCall === null
    ) {
      continue;
    }

    const {
      name,
      arguments: args,
    } = functionCall as {
      name?: unknown;
      arguments?: unknown;
    };

    if (name === SUMMARY_TOOL_NAME) {
      return args;
    }
  }

  return undefined;
}

function getSummaryToolArguments(
  response: unknown,
): unknown {
  const args = findSummaryToolArguments(response);

  if (args !== undefined) {
    return args;
  }

  console.error(
    "Model did not return the blog summary tool call. Text response:",
    getResponseText(response) ?? "(no text response)",
  );

  throw new Error(
    "Model did not return the blog summary tool call",
  );
}

export async function summarizeBlog(
  content: string,
): Promise<unknown> {
  if (!engine) {
    throw new Error("Engine not loaded");
  }

  const modelContent = prepareContentForModel(content);

  /*
   * Create one conversation per article.
   *
   * We intentionally do NOT reuse the conversation between articles,
   * because each blog post is an independent task.
   */
  const chat = await engine.createConversation({
    enableConstrainedDecoding: true,

    preface: {
      messages: [
        {
          role: "system",
          content: `You are a blog analysis assistant. Analyze the article and call ${SUMMARY_TOOL_NAME} with its title, a 2–3 sentence summary, 3–6 specific tags, and one allowed content type. Use only information supported by the article; do not invent facts.`,
        },
      ],

      tools: [SUMMARY_TOOL],
    },
  });

  try {
    const response = await chat.sendMessage(
      `Analyze this blog post:\n\n${modelContent}`,
    );

    return getSummaryToolArguments(response);
  } finally {
    /*
     * CRITICAL:
     *
     * Release the native/WASM conversation immediately after each
     * article. Without this, repeated processing can accumulate
     * conversation/session resources.
     *
     * The finally block also guarantees cleanup when inference throws.
     */
    try {
      await chat.delete();
    } catch (error) {
      console.warn(
        "Failed to delete LiteRT-LM conversation:",
        error,
      );
    }
  }
}