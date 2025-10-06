
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_128.js');

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
    
    const extensionId = "opcgpfmipidbgpenhmajoajpbobppdil";
    const timeout = 5000; // общее время ожидания в мс
    const interval = 500; // шаг ожидания между попытками
    const approveButtonXPath = "//button[@aria-label='Approve Connection' or .//text()[normalize-space()='Approve']]";
    const approveButtonSelector = `::-p-xpath(${approveButtonXPath})`;

    let extensionPage = null;
    const originalPages = await browser.pages();
    const originalPage = page;

    // Пытаемся найти нужную вкладку в течение timeout
    for (let elapsed = 0; elapsed < timeout; elapsed += interval) {
        const pages = await browser.pages();
        extensionPage = pages.find(p => p.url().includes(extensionId));
        if (extensionPage) break;
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    if (!extensionPage) {
        logger.error(`Вкладка с расширением ${extensionId} не найдена за ${timeout} мс`);
        return false;
    }

    try {
        await extensionPage.bringToFront();
        logger.info("Переключено на вкладку расширения");

        const button = await extensionPage.waitForSelector(approveButtonSelector, { timeout: 5000 });

        if (button) {
            await button.click();
            logger.info("Кнопка 'Approve Connection' нажата");

            // Возврат на изначальную вкладку
            await originalPage.bringToFront();
            logger.info("Возврат на изначальную вкладку");

            return true;
        } else {
            logger.error("Кнопка 'Approve Connection' не найдена");
            return false;
        }
    } catch (error) {
        logger.error(`Ошибка при обработке кнопки: ${error.message}`);
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
    