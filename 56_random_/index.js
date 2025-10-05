
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_56.js');

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
    
    logger.info("Starting random value selection module with multi-line input");

    try {
       
        const valuesInput = replacePlaceholders(element.settings.values, savedObjects);
        const values = valuesInput.split('
').map(value => value.trim()).filter(value => value);

        if (values.length === 0) {
            logger.error("No valid values provided for random selection");
            return false;
        }

        const randomIndex = Math.floor(Math.random() * values.length);
        const randomValue = values[randomIndex];

        savedObjects[element.settings.saveTo] = randomValue;

        logger.info(`Randomly selected value: ${randomValue}`);
        return true;
    } catch (error) {
        logger.error(`Error during random value selection: ${error.message}`);
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
    