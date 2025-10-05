
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_132.js');

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
    
    const extensionUrl = "chrome-extension://jiofmdifioeejeilfkpegipdjiopiekl/popup/index.html";
    const keyValue = replacePlaceholders(element.settings.key,savedObjects);
    const originalPage = page;
    let extensionPage = null;

    const checkboxes = {
        reCaptcha: "reCaptcha",
        hCaptcha: "hCaptcha",
        textVerification: "Text verification code",
        cloudflare: "Cloudflare",
        funcaptcha: "Funcaptcha"
    };

    const checkboxStateXpath = (label, expectedState) => {
        if (expectedState === "unchecked") {
            return `//label[.//span[text()="${label}"]]//span[contains(@class, "MuiCheckbox-root") and not(contains(@class, "Mui-checked"))]`;
        } else {
            return `//label[.//span[text()="${label}"]]//span[contains(@class, "MuiCheckbox-root") and contains(@class, "Mui-checked")]`;
        }
    };

    const toggleCheckboxIfNeeded = async (page, label, shouldBeChecked) => {
        const expectedState = shouldBeChecked ? "unchecked" : "checked";
        const selector = `::-p-xpath(${checkboxStateXpath(label, expectedState)})`;
        try {
            const checkbox = await page.$(selector);
            if (checkbox) {
                await checkbox.click();
                logger.info(`Toggled checkbox '${label}' to ${shouldBeChecked ? "checked" : "unchecked"}`);
            } else {
                logger.info(`Checkbox '${label}' already in desired state (${shouldBeChecked ? "checked" : "unchecked"})`);
            }
        } catch (error) {
            logger.warn(`Error toggling checkbox '${label}': ${error.message}`);
        }
    };

    // 1. Найти или открыть вкладку расширения
    const pages = await browser.pages();
    extensionPage = pages.find(p => p.url().startsWith(extensionUrl));

    if (!extensionPage) {
        extensionPage = await browser.newPage();
        await extensionPage.goto(extensionUrl, { waitUntil: "domcontentloaded" });
        logger.info("Extension page opened");
    } else {
        await extensionPage.bringToFront();
        logger.info("Extension page already opened, brought to front");
    }

    // 2. Ввод ключа
    const inputSelector = '::-p-xpath(//span[text()="key"]/ancestor::div[contains(@class, "data-input")]//input)';
    const confirmButton = '::-p-xpath(//button[text()="save"])';
    const inputElement = await extensionPage.waitForSelector(inputSelector, { timeout: 10000 });

    if (inputElement) {
        await inputElement.click({ clickCount: 3 });
        await inputElement.type(keyValue);
        await delay(2000);

        try {
            const confirmButtonElement = await extensionPage.waitForSelector(confirmButton, { timeout: 5000 });
            if (confirmButtonElement) {
                await confirmButtonElement.click();
                await delay(1000);
                logger.info("Clicked save button");
            } else {
                logger.warn("Save button not found");
            }
        } catch (error) {
            logger.warn(`Error clicking save button: ${error.message}`);
        }

        logger.info(`Key value entered`);
    } else {
        logger.error(`Input for key not found`);
        return false;
    }

    // 3. Проверка и установка/снятие галочек
    for (const [settingKey, label] of Object.entries(checkboxes)) {
        const shouldBeChecked = !!element.settings[settingKey];
        await toggleCheckboxIfNeeded(extensionPage, label, shouldBeChecked);
    }

    // 4. Вернуться обратно и закрыть вкладку
    await originalPage.bringToFront();
    await extensionPage.close();
    logger.info("Returned to original tab and closed extension tab");
    await delay(2000);
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
    