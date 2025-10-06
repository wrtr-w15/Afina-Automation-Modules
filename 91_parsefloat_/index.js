
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_91.js');

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
    
    try {
        // Replace placeholders with saved variables
        const inputText = replacePlaceholders(element.settings.inputString, savedObjects);

        // Replace commas with dots for decimal conversion
        const normalizedText = inputText.replace(/,/g, '.');

        // Convert string to number
        const convertedNumber = parseFloat(normalizedText);

        if (isNaN(convertedNumber)) {
            throw new Error(`The provided input '${inputText}' is not a valid number.`);
        }

        // Convert back to string with comma as decimal separator
        const resultWithComma = convertedNumber.toFixed(2).replace('.', ',');

        // Save the result to the specified variable
        savedObjects[element.settings.saveTo] = resultWithComma;

        logger.info(`Converted '${inputText}' to '${resultWithComma}'`);
        return true;
    } catch (error) {
        logger.error(`Error in String to Number Converter: ${error.message}`);
        return false;
    }
});
;

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
    