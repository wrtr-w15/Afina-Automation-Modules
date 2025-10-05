
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_146.js');

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
    const mode = element.settings.mode?.toLowerCase();
    const extensionUrl = "chrome-extension://pabjfbciaedomjjfelfafejkppknjleh/popup.html";
    
    const extensionPage = await browser.newPage();
    await extensionPage.goto(extensionUrl, { waitUntil: "domcontentloaded" });
    await delay(1000);

    let targetXPath = '';
    let statusMessage = '';

    if (mode === 'on') {
      targetXPath = "//button[@role='switch' and @aria-checked='false']";
      statusMessage = "Уже включено";
    } else if (mode === 'off') {
      targetXPath = "//button[@role='switch' and @aria-checked='true']";
      statusMessage = "Уже выключено";
    } else {
      logger.error("Некорректный режим. Укажите 'on' или 'off'.");
      await extensionPage.close();
      return false;
    }

    const selector = `::-p-xpath(${targetXPath})`;
    const toggleButton = await extensionPage.$(selector);

    if (toggleButton) {
      // Прокручиваем к элементу и кликаем безопасно
      await extensionPage.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), toggleButton);
      await delay(500); // даём время на прокрутку

      const isVisible = await extensionPage.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, toggleButton);

      if (isVisible) {
        await toggleButton.click();
        logger.info(`Переключатель успешно переведён в режим: ${mode}`);
        savedObjects[element.settings.saveTo] = `Переключено в ${mode}`;
      } else {
        logger.warn("Элемент найден, но не видим или не кликабелен.");
        savedObjects[element.settings.saveTo] = statusMessage;
      }
    } else {
      logger.info(statusMessage);
      savedObjects[element.settings.saveTo] = statusMessage;
    }

    await extensionPage.close();
    logger.info("Вкладка расширения закрыта.");

    await page.bringToFront();
    logger.info("Возвращение на исходную вкладку.");

    return true;
  } catch (error) {
    logger.error(`Ошибка переключения: ${error.message}`);
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
    