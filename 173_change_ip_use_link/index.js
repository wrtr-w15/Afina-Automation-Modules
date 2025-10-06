
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_173.js');

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
        const url = element.settings.url;

        // Открываем новую вкладку
        const newPage = await browser.newPage();
        logger.info(`Открыта новая вкладка.`);
        await newPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {
            logger.warn("Страница не загрузилась, продолжаем выполнение.");
        });
        logger.info(`Перешли по ссылке: ${url}`);

        await delay(3000);
        logger.info(`Ожидание 3 секунды завершено.`);
        await page.bringToFront();
        logger.info("Возврат на предыдущую вкладку.");
        await newPage.close();
        logger.info("Новая вкладка закрыта.");

        return true;
    } catch (error) {
        logger.error(`Ошибка в модуле перехода по ссылке: ${error.message}`);
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
    