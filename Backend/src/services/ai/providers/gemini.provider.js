const { GoogleGenAI } = require("@google/genai");

// ============================================================
// GEMINI CLIENT
// ============================================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ============================================================
// GET MODEL
// ============================================================

const getModel = () => {
  return process.env.GEMINI_MODEL || "gemini-3.6-flash";
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

  // ----------------------------------------------------------
  // Convert conversation into Gemini prompt
  // ----------------------------------------------------------

  const conversation = messages
    .map((message) => {
      return `${message.role}: ${message.content}`;
    })
    .join("\n");

  const prompt = `
${systemPrompt}

Conversation:
${conversation}
`;

  // ----------------------------------------------------------
  // Gemini configuration
  // ----------------------------------------------------------

  const config = {
    temperature: 0.7,
  };

  // ----------------------------------------------------------
  // JSON response mode
  // ----------------------------------------------------------

  if (responseFormat === "json") {
    config.responseMimeType = "application/json";
  }

  // ----------------------------------------------------------
  // Generate content
  // ----------------------------------------------------------

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config,
  });

  // ----------------------------------------------------------
  // Extract response
  // ----------------------------------------------------------

  const content = response?.text?.trim();

  if (!content) {
    throw new Error(`Gemini model ${model} returned an empty response`);
  }

  // ----------------------------------------------------------
  // Return standard provider response
  // ----------------------------------------------------------

  return {
    provider: "gemini",
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
  // Invalid request / model
  // ----------------------------------------------------------

  if (
    status === 400 ||
    status === 404 ||
    message.includes("not_found") ||
    message.includes("model not found") ||
    message.includes("model is not available") ||
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
  name: "gemini",
  generate,
  isRetryable,
};
