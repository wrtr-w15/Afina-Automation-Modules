
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_17.js');

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
    
    const extensionId = "acmacodkjbdgmoleebolmdjonilkdbch";
    
    const TIMEOUT = 20000; // Максимальное время работы
    const ELEMENT_WAIT_TIMEOUT = 5000; // Ждем элементы максимум 5 секунд
    const startTime = Date.now(); // Засекаем время старта

    function isTimeoutExceeded() {
        return (Date.now() - startTime) >= TIMEOUT;
    }

    let notificationPage = await waitForPage(browser, extensionId);
    if (!notificationPage || isTimeoutExceeded()) {
        logger.error('Страница уведомлений не найдена или время ожидания истекло.');
        return false;
    }

    await delay(2000); // Задержка перед поиском (если страница загрузилась)
    if (isTimeoutExceeded()) return false;

    const selectors = {
        selectorIgnoreAll: `::-p-xpath(//span[text()="Ignore all"])`,
        selectorConnect: `::-p-xpath(//button[not(@disabled)]//span[contains(text(), "Connect")])`
    };

    let resultSelector = await waitForAnySelector(notificationPage, selectors, ELEMENT_WAIT_TIMEOUT);
    if (isTimeoutExceeded()) return false;

    if (resultSelector === "selectorIgnoreAll") {
        logger.info('Нажимаем "Ignore all".');
        await notificationPage.click(selectors.selectorIgnoreAll);
        await delay(1000);
    }

    if (isTimeoutExceeded()) return false;

    resultSelector = await waitForAnySelector(notificationPage, selectors, ELEMENT_WAIT_TIMEOUT);
    if (isTimeoutExceeded()) return false;

    if (resultSelector === "selectorConnect") {
        logger.info('Нажимаем "Connect".');
        await notificationPage.click(selectors.selectorConnect);
        await delay(2000);
        savedObjects[element.settings.saveTo] = true;
        return true;
    }

    logger.error('Кнопка "Connect" не найдена.');
    return false;
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
    