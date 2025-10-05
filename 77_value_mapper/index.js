
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_77.js');

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
    
    const inputValue = replacePlaceholders(element.settings.inputValue, savedObjects);
    const textareaContent = replacePlaceholders(element.settings.mapping, savedObjects);


    const mappingLines = textareaContent.split('
');
    let result = null;

    for (const line of mappingLines) {
        const [key, value] = line.split(/:(.+)/).map(s => s.trim()); // исправлено разделение
        if (key === inputValue) {
            result = value;
            break;
        }
    }

    if (element.settings.saveTo) {
        savedObjects[element.settings.saveTo] = result || element.settings.defaultValue || null;
    }

    return result || element.settings.defaultValue || null;
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
    