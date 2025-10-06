
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_145.js');

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
        // --- Настройки ---
        const mode = element.settings.mode || 'xpath';
        const value = replacePlaceholders(element.settings.value, savedObjects);

        const waitTime = element.settings.waitTime
            ? parseInt(replacePlaceholders(element.settings.waitTime, savedObjects), 10)
            : 5000;

        // XPath целевого элемента (куда кликаем/вставляем)
        const targetXPathRaw = element.settings.xpath || '';
        const targetXPath = replacePlaceholders(targetXPathRaw, savedObjects);

        // XPath айфрейма (опционально). Если указан — работаем внутри него
        const iframeXPathRaw = element.settings.iframeXPath || '';
        const iframeXPath = replacePlaceholders(iframeXPathRaw, savedObjects).trim();

        // --- Определяем контекст (страница или iframe) ---
        // По умолчанию работаем на странице
        let context = page;

        if (iframeXPath) {
            const iframeSelector = `::-p-xpath(${iframeXPath})`;
            logger.info(`Ожидаем iframe по XPath: ${iframeSelector}`);

            // Ждём сам iframe
            const iframeHandle = await page.waitForSelector(iframeSelector, { timeout: waitTime });
            if (!iframeHandle) {
                logger.error(`Iframe не найден по XPath: ${iframeSelector}`);
                return false;
            }

            // Переходим в контентный фрейм
            const contentFrame = await iframeHandle.contentFrame();
            if (!contentFrame) {
                logger.error(`Не удалось получить contentFrame у найденного iframe.`);
                return false;
            }

            context = contentFrame;
            logger.info(`Контекст переключён на iframe.`);
        }

        // --- Действие по XPath ---
        if (mode === 'xpath') {
            if (!targetXPath) {
                logger.error(`Пустой XPath целевого элемента. Укажите element.settings.xpath`);
                return false;
            }

            const selector = `::-p-xpath(${targetXPath})`;
            logger.info(`Ожидаем целевой элемент по XPath: ${selector}`);

            const targetElement = await context.waitForSelector(selector, { timeout: waitTime });
            if (!targetElement) {
                logger.error(`Элемент не найден по XPath: ${selector}`);
                return false;
            }

            await targetElement.click();
            await delay(500);
        } else {
            logger.info(`Режим "${mode}": используем текущее активное поле без поиска по XPath.`);
        }

        // --- Вставка через событие 'paste' в активное поле ---
        // ВАЖНО: используется evaluate внутри выбранного контекста (страница или iframe).
        await context.evaluate((val) => {
            const active = document.activeElement;
            if (!active) return;

            const dt = new DataTransfer();
            dt.setData('text/plain', val);

            const pasteEv = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dt,
            });

            active.dispatchEvent(pasteEv);
        }, value);

        logger.info(`Успешно вставлено значение через событие 'paste' в активное поле.`);
        return true;

    } catch (error) {
        logger.error(`Ошибка при вставке значения через paste: ${error && error.message ? error.message : error}`);
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
    