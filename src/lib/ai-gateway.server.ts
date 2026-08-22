export class AiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

type Msg = {
  role: "system" | "user" | "assistant";
  content: string;
};

const GROQ_CANDIDATE_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "groq/compound",
];

function getAiConfig() {
  const groqKey = process.env['GROQ_API_KEY'];
  const geminiKey = process.env['GEMINI_API_KEY'];
  const openAiKey = process.env['OPENAI_API_KEY'];

  if (groqKey) {
    const specifiedModel = process.env['GROQ_MODEL'];
    const models = specifiedModel
      ? [specifiedModel, ...GROQ_CANDIDATE_MODELS.filter((m) => m !== specifiedModel)]
      : GROQ_CANDIDATE_MODELS;

    return {
      apiUrl: process.env['GROQ_API_URL'] || "https://api.groq.com/openai/v1/chat/completions",
      apiKey: groqKey,
      models,
      provider: "Groq",
    };
  }

  if (geminiKey) {
    return {
      apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: geminiKey,
      models: [process.env['GEMINI_MODEL'] || "gemini-2.0-flash"],
      provider: "Gemini",
    };
  }

  if (openAiKey) {
    return {
      apiUrl: "https://api.openai.com/v1/chat/completions",
      apiKey: openAiKey,
      models: [process.env['OPENAI_MODEL'] || "gpt-4o-mini"],
      provider: "OpenAI",
    };
  }

  return {
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: "",
    models: GROQ_CANDIDATE_MODELS,
    provider: "None",
  };
}

export async function chat(
  messages: Msg[],
  opts?: { json?: boolean },
): Promise<string> {
  const { apiUrl, apiKey, models, provider } = getAiConfig();

  if (!apiKey) {
    throw new AiError("The AI service is not configured yet (missing GROQ_API_KEY or GEMINI_API_KEY).", 500);
  }

  const groqMessages = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  if (opts?.json) {
    groqMessages.unshift({
      role: "system",
      content:
        "Return your response as valid JSON only. Do not include markdown, code fences, explanations, or any text outside the JSON object.",
    });
  }

  let lastErrorText = "";
  let lastStatus = 500;

  for (const model of models) {
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: groqMessages,
          temperature: 0.2,
          ...(opts?.json
            ? {
                response_format: {
                  type: "json_object",
                },
              }
            : {}),
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{
            message?: {
              content?: string;
            };
          }>;
        };

        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return content;
        }
      }

      lastStatus = res.status;
      lastErrorText = await res.text().catch(() => "");
      console.warn(`Groq model ${model} failed with status ${res.status}: ${lastErrorText}. Trying fallback model...`);

      // If status is 401 (invalid auth key), no point in retrying other models
      if (res.status === 401) {
        throw new AiError("Invalid API key provided for the AI service. Please check your credentials.", 401);
      }
    } catch (fetchErr) {
      if (fetchErr instanceof AiError) throw fetchErr;
      console.warn(`Network error attempting model ${model}:`, fetchErr);
    }
  }

  console.error("All AI models exhausted. Last error:", lastStatus, lastErrorText);

  if (lastStatus === 429) {
    throw new AiError("The AI service is currently busy (rate limit). Please try again in a few moments.", 429);
  }

  throw new AiError("The AI service returned an error. Please try again.", lastStatus);
}

export async function chatJson<T>(messages: Msg[]): Promise<T> {
  const raw = await chat(messages, { json: true });

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        // Fall through.
      }
    }

    throw new AiError(
      "The AI response could not be understood. Please try again.",
      502,
    );
  }
}
