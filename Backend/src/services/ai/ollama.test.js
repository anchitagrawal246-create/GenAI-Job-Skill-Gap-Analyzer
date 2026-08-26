const groqProvider = require("./providers/groq.provider");

// ============================================================
// PROVIDERS
// ============================================================

const providers = [groqProvider];

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

      if (
        !result ||
        typeof result.content !== "string" ||
        !result.content.trim()
      ) {
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

      if (
        typeof provider.isRetryable === "function" &&
        !provider.isRetryable(error)
      ) {
        throw error;
      }

      console.log(`[AI Gateway] Provider ${provider.name} failed`);
    }
  }

  throw new Error(
    `All AI providers failed. Last error: ${
      lastError?.message || "Unknown error"
    }`,
  );
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  generateAIResponse,
};
