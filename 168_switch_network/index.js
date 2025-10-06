
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_168.js');

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
    const symbol = replacePlaceholders(element.settings.nativeCurrencySymbol,savedObjects);

    const network = {
      chainId: replacePlaceholders(element.settings.chainId,savedObjects),
      chainName: replacePlaceholders(element.settings.chainName,savedObjects),
      nativeCurrency: {
        name: symbol,
        symbol: symbol,
        decimals: 18
      },
      rpcUrls: [replacePlaceholders(element.settings.rpcUrl,savedObjects)],
      blockExplorerUrls: [replacePlaceholders(element.settings.blockExplorerUrl,savedObjects)],
    };

    await page.evaluate((network) => {
      window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [network],
      });
    }, network);

    return true;
  } catch (err) {
    logger.error(`Failed to add/switch network: ${err.message}`);
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
    