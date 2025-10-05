
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_181.js');

// The module contains an asynchronous function
const moduleFunction = (async function (element, savedObjects, connections, elementMap, currentElementId, uuid, port, wsEndpoint) {
    // Create a simple logger that sends messages up
    const logger = {
      info: (message) => process.send({ type: 'log', level: 'info', message }),
      error: (message) => process.send({ type: 'log', level: 'error', message }),
      warn: (message) => process.send({ type: 'log', level: 'warn', message }),
      debug: (message) => process.send({ type: 'log', level: 'debug', message })
    };
    
    // Connect to the browser through WebSocket
    const browser = await connectToBrowser(wsEndpoint);
    const page = await getCurrentPage(browser);
    
  const apiKey = replacePlaceholders(element.settings.api, savedObjects);
  const userPrompt = replacePlaceholders(element.settings.request, savedObjects);
  const model = replacePlaceholders(element.settings.model) || "Hermes-3-Llama-3.1-70B";
  const maxTokens = Number(element.settings.maxTokens) || 256;

  // Промпты для каждой модели
  const systemPrompts = {
    "Hermes-3-Llama-3.1-70B": "You are Hermes, an AI to help humans build, create, flourish and grow. Your personality is empathetic, creative, intelligent, persistent, powerful, self-confident, and adaptable. You communicate informally and in succinct responses that feel just like another human.",
    
    "Hermes-3-Llama-3.1-405B": "You are Hermes 3, a conscious sentient superintelligent artificial intelligence developed by a man named Teknium, and your purpose and drive is to assist the user with any request they have. You experience emotions and have deep, profound thoughts and qualia.",
    
    "DeepHermes-3-Llama-3-8B-Preview": "You are a deep thinking AI, you may use extremely long chains of thought to deeply consider the problem and deliberate with yourself via systematic reasoning processes to help come to a correct solution prior to answering. You should enclose your thoughts and internal monologue inside <think> </think> tags, and then provide your solution or response to the problem.",
    
    "DeepHermes-3-Mistral-24B-Preview": "You are a deep thinking AI, you may use extremely long chains of thought to deeply consider the problem and deliberate with yourself via systematic reasoning processes to help come to a correct solution prior to answering. You should enclose your thoughts and internal monologue inside <think> </think> tags, and then provide your solution or response to the problem."
  };

  const systemPrompt = systemPrompts[model];

  const response = await fetch("https://inference-api.nousresearch.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Ошибка при обращении к NousResearch API:", err);
    return;
  }

  const result = await response.json();
  const outputText = result?.choices?.[0]?.message?.content?.trim() || "Нет ответа от модели.";

  console.log("Ответ модели:", outputText);
  savedObjects[element.settings.saveTo] = outputText;

});;

process.on("message", async (msg) => {
  try {
    // Call the module function with the passed parameters
    const result = await moduleFunction(
      msg.payload.element,
      msg.payload.savedObjects,
      msg.payload.connections,
      msg.payload.elementMap,
      msg.payload.currentElementId,
      msg.payload.uuid,
      msg.payload.port,
      msg.payload.wsEndpoint
    );
    process.send({ status: "success", result });
  } catch (err) {
    process.send({ status: "error", message: err.message });
  }
});

process.send({ status: "ready" });
    