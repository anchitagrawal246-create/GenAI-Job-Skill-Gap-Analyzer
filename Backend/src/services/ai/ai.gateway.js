const groqProvider = require("./providers/groq.provider");
const geminiProvider = require("./providers/gemini.provider");
const deepseekProvider = require("./providers/deepseek.provider");
const ollamaProvider = require("./providers/ollama.provider");

// ============================================================
// PROVIDER PRIORITY
// ============================================================

const providers = [
  groqProvider,
  geminiProvider,
  deepseekProvider,
  ollamaProvider,
];

// ============================================================
// GENERATE AI RESPONSE
// ============================================================

const generateAIResponse = async ({
  systemPrompt,
  messages = [],
  responseFormat = "text",
}) => {
  let lastError = null;

  for (const provider of providers) {
    try {
      console.log(`[AI Gateway] Trying provider: ${provider.name}`);

      const result = await provider.generate({
        systemPrompt,
        messages,
        responseFormat,
      });

      if (!result || !result.content) {
        throw new Error(`${provider.name} returned an empty response`);
      }

      console.log(`[AI Gateway] Success: ${provider.name}`);

      return result;
    } catch (error) {
      lastError = error;

      console.error(
        `[AI Gateway] ${provider.name} failed:`,
        error?.message || error,
      );

      // --------------------------------------------------------
      // Decide whether to fallback
      // --------------------------------------------------------

      if (
        typeof provider.isRetryable === "function" &&
        !provider.isRetryable(error)
      ) {
        throw error;
      }

      console.log(`[AI Gateway] Falling back from ${provider.name}`);
    }
  }

  throw new Error(
    `All AI providers failed. Last error: ${
      lastError?.message || "Unknown error"
    }`,
  );
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  generateAIResponse,
};
