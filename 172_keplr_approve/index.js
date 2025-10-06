
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_172.js');

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
    
    const extensionId = "dmkamcknogkgcdfhhbddcghachkejeap";
    const switchTimeout = parseInt(element.settings.switchTimeout || 10000, 10);
    const approveTimeout = parseInt(element.settings.approveTimeout || 15000, 10);

    const originalPage = page;
    let extensionPage = null;

    // Ждём появления вкладки с расширением
    const startTime = Date.now();
    while ((Date.now() - startTime) < switchTimeout) {
        const pages = await browser.pages();
        extensionPage = pages.find(p => p.url().includes(extensionId));

        if (extensionPage) {
            logger.info("Найдена вкладка с расширением.");
            break;
        }

        await delay(500);
    }

    if (!extensionPage) {
        logger.error("Вкладка с расширением не найдена.");
        return false;
    }

    try {
        await extensionPage.bringToFront();
        logger.info("Переключились на вкладку расширения.");

        const approveSelector = '::-p-xpath(//button[.//div[text()="Approve"]])';
        const approveButton = await extensionPage.waitForSelector(approveSelector, { timeout: approveTimeout });

        if (approveButton) {
            await delay(300);
            await approveButton.click();
            logger.info("Кнопка 'Approve' нажата.");
        } else {
            logger.warn("Кнопка 'Approve' не найдена.");
        }
    } catch (error) {
        logger.error(`Ошибка при работе с кнопкой 'Approve': ${error.message}`);
    }

    await originalPage.bringToFront();
    logger.info("Вернулись на исходную вкладку.");

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
    