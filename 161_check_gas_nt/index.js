
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_161.js');

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
    

    const apiKey = replacePlaceholders(element.settings.apiKey,savedObjects);
    const threshold = parseFloat(replacePlaceholders(element.settings.threshold, savedObjects));
    const saveTo = element.settings.saveTo;

    const url = `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${apiKey}`;

    try {
        const response = await fetch(url, { signal });
        const data = await response.json();

        if (data.status === "1" && data.result) {
            const safe = parseFloat(data.result.SafeGasPrice);
            const propose = parseFloat(data.result.ProposeGasPrice);
            const fast = parseFloat(data.result.FastGasPrice);

            const minGas = Math.min(safe, propose, fast);
            savedObjects[saveTo] = minGas;

            logger.info(`Минимальное значение газа: ${minGas} Gwei (порог: ${threshold} Gwei)`);

            return true;
        } else {
            logger.error(`Ошибка API: ${data.message}`);
            return false;
        }
    } catch (error) {
        logger.error(`Ошибка запроса к Etherscan: ${error.message}`);
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
    