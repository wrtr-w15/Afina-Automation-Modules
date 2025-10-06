
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_163.js');

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
    
    const replacePlaceholders = (str, objects = savedObjects) => {
        return str.replace(/\$\{(.*?)\}/g, (_, key) => objects[key] || "");
    };

    const agentId = replacePlaceholders(element.settings.agentId);
    const apiKey = replacePlaceholders(element.settings.apiKey);
    const endpoint = replacePlaceholders(element.settings.endpoint); // e.g. "message"
    const method = (element.settings.method || "POST").toUpperCase();
    const bodyContent = replacePlaceholders(element.settings.body);
    const saveTo = element.settings.saveTo;

    const url = `https://api.fleek.xyz/api/v1/ai-agents/${agentId}/api/${endpoint}`;
    logger.info(`Sending ${method} request to ${url}`);

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            ...(method !== "GET" ? { body: bodyContent } : {})
        });

        const json = await res.json();
        savedObjects[saveTo] = json;
        logger.info(JSON.stringify(json, null, 2));
        logger.info(`Response saved to ${saveTo}`);
        return true;
    } catch (error) {
        logger.error(`Fleek API request failed: ${error.message}`);
        savedObjects[saveTo] = { error: error.message };
        return false;
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
    