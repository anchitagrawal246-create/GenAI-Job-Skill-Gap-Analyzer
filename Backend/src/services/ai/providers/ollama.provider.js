const generate = async ({
  systemPrompt,
  messages = [],
  responseFormat = "text",
}) => {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

  const model = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";

  const requestBody = {
    model,

    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages,
    ],

    stream: false,

    options: {
      temperature: 0.7,
    },
  };

  // ==========================================================
  // JSON RESPONSE MODE
  // ==========================================================

  if (responseFormat === "json") {
    requestBody.format = "json";
  }

  // ==========================================================
  // CALL OLLAMA
  // ==========================================================

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(requestBody),
  });

  // ==========================================================
  // HANDLE HTTP ERROR
  // ==========================================================

  if (!response.ok) {
    const errorText = await response.text();

    const error = new Error(`Ollama error ${response.status}: ${errorText}`);

    error.status = response.status;

    throw error;
  }

  // ==========================================================
  // PARSE RESPONSE
  // ==========================================================

  const data = await response.json();

  const content = data?.message?.content?.trim() || "";

  if (!content) {
    throw new Error(`Ollama model ${model} returned an empty response`);
  }

  // ==========================================================
  // RETURN STANDARD PROVIDER RESPONSE
  // ==========================================================

  return {
    provider: "ollama",
    model,
    content,
  };
};

// ============================================================
// RETRY / FALLBACK
// ============================================================

const isRetryable = (error) => {
  const status = error?.status || error?.statusCode || error?.response?.status;

  // Connection errors generally don't have an HTTP status.
  // Since Ollama is a fallback provider, don't retry it again
  // inside the gateway.
  if (!status) {
    return false;
  }

  // Rate limit
  if (status === 429) {
    return true;
  }

  // Timeout
  if (status === 408) {
    return true;
  }

  // Server errors
  if (status >= 500) {
    return true;
  }

  return false;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  name: "ollama",
  generate,
  isRetryable,
};
