
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_182.js');

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
    
  const apiKey     = replacePlaceholders(element.settings.api, savedObjects);
  const userPrompt = replacePlaceholders(element.settings.request, savedObjects);
  const modelIn    = replacePlaceholders(element.settings.model, savedObjects);
  const model      = modelIn || "Hermes-3-Llama-3.1-70B";
  const maxTokens  = Number(element.settings.maxTokens) || 512;
  const saveTo     = element.settings.saveTo || "llmResponse";

  if (!apiKey) {
    const msg = "API ключ не задан (element.settings.api).";
    logger?.error?.(msg);
    savedObjects[saveTo] = { error: msg };
    return savedObjects;
  }
  if (!userPrompt) {
    const msg = "Пустой пользовательский запрос (element.settings.request).";
    logger?.error?.(msg);
    savedObjects[saveTo] = { error: msg };
    return savedObjects;
  }

  // Больше нет жёстких системных промптов
  const systemPrompt = "";

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null;

  try {
    const response = await fetch("https://inference-api.nousresearch.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: userPrompt }
        ],
        max_tokens: maxTokens
      }),
      signal: controller?.signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => String(response.status));
      const msg = `Ошибка NousResearch API: ${response.status} ${errText}`;
      logger?.error?.(msg);
      savedObjects[saveTo] = { error: msg };
      return savedObjects;
    }

    const result = await response.json();
    let outputText = result?.choices?.[0]?.message?.content?.trim() || "";

    // Убираем лишние теги <think> и скобки, но не обрезаем предложение
    outputText = outputText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    outputText = outputText.replace(/\(.*?\)/g, "").trim();

    if (!outputText) outputText = "No response";

    logger?.info?.(`Ответ модели: ${outputText}`);
    savedObjects[saveTo] = outputText;

    return savedObjects;
  } catch (e) {
    if (timeoutId) clearTimeout(timeoutId);
    const msg = `Сетевая ошибка или таймаут: ${e?.message || e}`;
    logger?.error?.(msg);
    savedObjects[saveTo] = { error: msg };
    return savedObjects;
  }
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
    