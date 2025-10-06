
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_29.js');

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
    
    const replacePlaceholders = (str) => {
        return str.replace(/\{\{(.*?)\}\}/g, (_, variable) => savedObjects[variable] || variable);
    };
    
    const extensionId = "acmacodkjbdgmoleebolmdjonilkdbch";
    const maxWaitTime = parseFloat(replacePlaceholders(element.settings.maxWaitTime)) || 10000;
    const expectedText = replacePlaceholders(element.settings.expectedText) || "";
    const maxRepeats = parseInt(replacePlaceholders(element.settings.repeats)) || 1;
    let result = "Not Equal";
    
    for (let attempt = 0; attempt < maxRepeats; attempt++) {
        let targetPage = null;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            const pages = await browser.pages();
            targetPage = pages.find(p => p.url().includes(extensionId));
            if (targetPage) break;
        }

        if (!targetPage) {
            logger.error("Вкладка Rabby не найдена");
            savedObjects[element.settings.saveTo] = result;
            return false;
        }

        await targetPage.bringToFront();
        logger.info("Переключились на вкладку Rabby");

        try {
            const textElementXPath = "::-p-xpath(//div[@class='text'])";
            await targetPage.waitForSelector(textElementXPath, { timeout: 10000 });
            const textElement = await targetPage.$(textElementXPath);
            const textContent = textElement ? await targetPage.evaluate(el => el.textContent, textElement) : "";

            if (textContent.trim() !== expectedText.trim()) {
                logger.error("Текст не совпадает");
                savedObjects[element.settings.saveTo] = result;
                return false;
            }
        } catch (error) {
            logger.error("Текст не найден в течение 10 секунд");
            savedObjects[element.settings.saveTo] = result;
            return false;
        }

        result = "Equal";
        
        const signButtonXPath = "::-p-xpath(//button[contains(@class, 'ant-btn') and not(@disabled)]/span[text()='Sign']/parent::button)";
        await targetPage.waitForSelector(signButtonXPath, { timeout: maxWaitTime });
        
        logger.info("Кнопка Sign появилась, ожидаем 1000 мс");
        await new Promise(resolve => setTimeout(resolve, 1000));

        const signButton = await targetPage.$(signButtonXPath);
        if (signButton) {
            await signButton.click();
            logger.info("Нажата кнопка Sign");
        } else {
            logger.error("Кнопка Sign не найдена");
            savedObjects[element.settings.saveTo] = result;
            return false;
        }

        const confirmButtonXPath = "::-p-xpath(//button[text()='Confirm'])";
        await targetPage.waitForSelector(confirmButtonXPath, { timeout: maxWaitTime });
        
        const confirmButton = await targetPage.$(confirmButtonXPath);
        if (confirmButton) {
            await confirmButton.click();
            logger.info("Нажата кнопка Confirm");
        } else {
            logger.error("Кнопка Confirm не найдена");
            savedObjects[element.settings.saveTo] = result;
            return false;
        }
    }
    
    savedObjects[element.settings.saveTo] = result;
    return true;
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
    