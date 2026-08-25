const ollama = require("./providers/ollama.provider");

async function test() {
  try {
    const result = await ollama.generate({
      systemPrompt: "You are a technical interviewer. Give concise answers.",

      messages: [
        {
          role: "user",
          content: "Ask me one JavaScript interview question.",
        },
      ],
    });

    console.log("\n==============================");
    console.log("Provider:", result.provider);
    console.log("Model:", result.model);
    console.log("Response:", result.content);
    console.log("==============================\n");
  } catch (error) {
    console.error("OLLAMA FAILED:");
    console.error(error);
  }
}

test();
