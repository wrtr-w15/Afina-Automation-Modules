
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_54.js');

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
    
    logger.info("Starting string manipulation module");

    try {
        const inputString = replacePlaceholders(element.settings.inputString, savedObjects);
        const searchValue = replacePlaceholders(element.settings.searchValue, savedObjects);
        const replaceValue = replacePlaceholders(element.settings.replaceValue, savedObjects);

        if (!inputString || !searchValue) {
            logger.error("Input string or search value is missing");
            return false;
        }

        const updatedString = inputString.replace(new RegExp(searchValue, 'g'), replaceValue || '');

        savedObjects[element.settings.saveTo] = updatedString;

        logger.info(`Updated string saved: ${updatedString}`);
        return true;
    } catch (error) {
        logger.error(`Error during string manipulation: ${error.message}`);
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
    