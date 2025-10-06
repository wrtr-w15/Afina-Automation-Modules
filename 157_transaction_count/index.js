
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_157.js');

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
    
    const rpcUrl = replacePlaceholders(element.settings.rpcUrl,savedObjects);
    const walletAddress = replacePlaceholders(element.settings.walletAddress,savedObjects);
    const saveTo = element.settings.saveTo;

    if (!rpcUrl || !walletAddress) {
        logger.error("RPC URL или адрес кошелька не указан.");
        return false;
    }

    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getTransactionCount',
                params: [walletAddress, 'latest'],
                id: 1
            })
        });

        const json = await response.json();

        if (!json.result) {
            logger.error(`Ошибка в RPC ответе: ${JSON.stringify(json)}`);
            return false;
        }

        const txCount = parseInt(json.result, 16); // Преобразуем из hex в число
        savedObjects[saveTo] = txCount;

        logger.info(`Количество транзакций: ${txCount}`);
        return true;
    } catch (err) {
        logger.error(`Ошибка при запросе к RPC: ${err.message}`);
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
    