const OpenAI = require("openai");

// ============================================================
// DEEPSEEK CLIENT
// ============================================================

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// ============================================================
// GET MODEL
// ============================================================

const getModel = () => {
  return process.env.DEEPSEEK_MODEL || "deepseek-chat";
};

// ============================================================
// GENERATE RESPONSE
// ============================================================

const generate = async ({
  systemPrompt,
  messages = [],
  responseFormat = "text",
}) => {
  const model = getModel();

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

  // ==========================================================
  // JSON RESPONSE MODE
  // ==========================================================

  if (responseFormat === "json") {
    request.response_format = {
      type: "json_object",
    };
  }

  // ==========================================================
  // CALL DEEPSEEK
  // ==========================================================

  const completion = await deepseek.chat.completions.create(request);

  // ==========================================================
  // EXTRACT RESPONSE
  // ==========================================================

  const content = completion?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error(`DeepSeek model ${model} returned an empty response`);
  }

  // ==========================================================
  // RETURN STANDARD PROVIDER RESPONSE
  // ==========================================================

  return {
    provider: "deepseek",
    model,
    content,
  };
};

// ============================================================
// RETRY / FALLBACK
// ============================================================

const isRetryable = (error) => {
  const status = error?.status || error?.statusCode || error?.response?.status;

  const message = error?.message?.toLowerCase() || "";

  // ----------------------------------------------------------
  // Invalid model / request
  // ----------------------------------------------------------

  if (
    status === 400 ||
    status === 404 ||
    message.includes("model_not_found") ||
    message.includes("model not found") ||
    message.includes("does not exist")
  ) {
    return true;
  }

  // ----------------------------------------------------------
  // Authentication / permission
  // ----------------------------------------------------------

  if (status === 401 || status === 403) {
    return true;
  }

  // ----------------------------------------------------------
  // Timeout
  // ----------------------------------------------------------

  if (status === 408) {
    return true;
  }

  // ----------------------------------------------------------
  // Rate limit
  // ----------------------------------------------------------

  if (status === 429) {
    return true;
  }

  // ----------------------------------------------------------
  // Server errors
  // ----------------------------------------------------------

  if (status >= 500) {
    return true;
  }

  return false;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  name: "deepseek",
  generate,
  isRetryable,
};
