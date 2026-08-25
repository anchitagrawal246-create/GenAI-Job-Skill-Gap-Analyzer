const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// MODEL CACHE
// ============================================================

let cachedModels = null;
let cacheTime = 0;

const MODEL_CACHE_TTL = 5 * 60 * 1000;

// ============================================================
// CHECK MODEL
// ============================================================

const isUsableModel = (model) => {
  const id = model?.id?.toLowerCase();

  if (!id) {
    return false;
  }

  const excluded = ["whisper", "orpheus", "guard", "prompt-guard", "safeguard"];

  return !excluded.some((name) => id.includes(name));
};

// ============================================================
// GET AVAILABLE MODELS
// ============================================================

const getAvailableModels = async () => {
  const now = Date.now();

  if (cachedModels && now - cacheTime < MODEL_CACHE_TTL) {
    return cachedModels;
  }

  const response = await groq.models.list();

  const models = response.data.filter(isUsableModel).map((model) => model.id);

  if (!models.length) {
    throw new Error("Groq has no usable chat models available");
  }

  cachedModels = models;
  cacheTime = now;

  console.log("[Groq] Available models:", models);

  return models;
};

// ============================================================
// MODEL PRIORITY
// ============================================================

const getModelPriority = (models) => {
  const preferred = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b",
    "groq/compound",
    "groq/compound-mini",
  ];

  const sorted = [];

  for (const model of preferred) {
    if (models.includes(model)) {
      sorted.push(model);
    }
  }

  for (const model of models) {
    if (!sorted.includes(model)) {
      sorted.push(model);
    }
  }

  return sorted;
};

// ============================================================
// GENERATE
// ============================================================

const generate = async ({
  systemPrompt,
  messages = [],
  responseFormat = "text",
}) => {
  const availableModels = await getAvailableModels();

  const models = getModelPriority(availableModels);

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[Groq] Trying model: ${model}`);

      const request = {
        model,

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messages,
        ],

        temperature: 0.7,
      };

      // ------------------------------------------------------
      // JSON response mode
      // ------------------------------------------------------

      if (responseFormat === "json") {
        request.response_format = {
          type: "json_object",
        };
      }

      const completion = await groq.chat.completions.create(request);

      const content = completion?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`Groq model ${model} returned an empty response`);
      }

      console.log(`[Groq] Success: ${model}`);

      return {
        provider: "groq",
        model,
        content,
      };
    } catch (error) {
      lastError = error;

      console.error(`[Groq] Model ${model} failed:`, error?.message || error);
    }
  }

  throw new Error(
    `All Groq models failed. Last error: ${
      lastError?.message || "Unknown error"
    }`,
  );
};

// ============================================================
// RETRY / FALLBACK
// ============================================================

const isRetryable = (error) => {
  const status = error?.status || error?.statusCode || error?.response?.status;

  const message = error?.message?.toLowerCase() || "";

  if (
    status === 400 ||
    status === 404 ||
    message.includes("model_not_found") ||
    message.includes("does not exist") ||
    message.includes("do not have access to it")
  ) {
    return true;
  }

  if (status === 401 || status === 403) {
    return true;
  }

  if (status === 408) {
    return true;
  }

  if (status === 429) {
    return true;
  }

  if (status >= 500) {
    return true;
  }

  return false;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  name: "groq",
  generate,
  isRetryable,
};
