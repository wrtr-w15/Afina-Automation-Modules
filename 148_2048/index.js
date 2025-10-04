
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_148.js');

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
    
    const minDelay = parseInt(element.settings.minDelay) || 500;
    const maxDelay = parseInt(element.settings.maxDelay) || 1500;
    const totalPresses = parseInt(element.settings.totalPresses) || 10;

    const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const directions = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

    for (let i = 0; i < totalPresses; i++) {
        const direction = directions[getRandom(0, directions.length - 1)];

        await page.keyboard.press(direction);
        logger.info(`Pressed key: ${direction}`);

        const waitTime = getRandom(minDelay, maxDelay);
        logger.info(`Waiting ${waitTime} ms before next key press`);
        await delay(waitTime);
    }

    logger.info(`Total ${totalPresses} random key presses completed.`);
    return true;
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
    