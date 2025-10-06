
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_153.js');

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
        logger.info("Starting full cookie and storage cleanup...");

        // Очистка всех куков через CDP
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        logger.info("Browser cookies cleared successfully.");

        // Очистка локального хранилища и сессий
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        logger.info("LocalStorage and SessionStorage cleared successfully.");

        // Перезагрузка страницы
        logger.info("Reloading the page...");
        await page.reload({ waitUntil: 'networkidle0' });
        logger.info("Page reloaded successfully.");

        return true;
    } catch (error) {
        logger.error(`Error during full cleanup: ${error.message}`);
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
    