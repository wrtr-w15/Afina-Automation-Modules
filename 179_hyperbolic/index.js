
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_179.js');

// The module contains an asynchronous function
const moduleFunction = // Hyperbolic → Chat Completions с выбором модели из select
(async function (element, savedObjects, connections, elementMap, currentElementId, uuid, port, wsEndpoint) {
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
    

  const apiKey = replacePlaceholders(element.settings.apiKey,savedObjects);
  if (!apiKey) throw new Error("Укажите Hyperbolic API Key.");

  const userPrompt = replacePlaceholders(element.settings.userPrompt,savedObjects);
  if (!userPrompt) throw new Error("Поле Prompt пустое.");

  // выбор из select (есть дефолт)
  const model = (element.settings.modelSelect || "meta-llama/Meta-Llama-3.1-70B-Instruct");
  const saveTo = (element.settings.saveTo || "hyperbolicResult");

  // — запрос —
  const endpoint = "https://api.hyperbolic.xyz/v1/chat/completions";
  const body = {
    model,
    messages: [{ role: "user", content: userPrompt }],
    stream: false
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hyperbolic API error: ${res.status} ${res.statusText} — ${text}`);
  }

  const data = await res.json();
  const content =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    "";

  logger.info(content);
  savedObjects[saveTo] = content;
  return savedObjects;
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
    