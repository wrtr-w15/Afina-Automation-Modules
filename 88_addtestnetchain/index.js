
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_88.js');

// The module contains an asynchronous function
const moduleFunction = (async function (element, savedObjects, connections, elementMap, currentElementId, uuid, jsonConfig, port, wsEndpoint) {
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
    
  // Custom synchronous delay using a blocking loop
    const delay = async (ms) => {
        const start = Date.now();
        while (Date.now() - start < ms) {
            // Blocking loop for the specified delay
        }
    };

    const targetxpath = replacePlaceholders(element.settings.targetxpath, savedObjects).trim();
    const chainID = replacePlaceholders(element.settings.chainID, savedObjects).trim();

  try {
    const extensionUrl = 'chrome-extension://acmacodkjbdgmoleebolmdjonilkdbch/index.html';
    const newPage = await browser.newPage();
    await newPage.goto(extensionUrl);
    await delay(2000);

    async function clickButton(selector) {
      const button = await newPage.$(selector);
      if (button) {
        await button.click();
        await delay(2000);
        return true;
      }
      return false;
    }

    const buttonSelector = '::-p-xpath(//div[contains(@class,"mt-[4px] mb-10")])';
    const customNetworkSelector = '::-p-xpath(//div[text()="Custom Network"])';

    await clickButton(buttonSelector);
    await clickButton(customNetworkSelector);

    const targetElement = await newPage.waitForSelector(`::-p-xpath(${targetxpath})`, { timeout: 10000 }).catch(() => null);

    if (targetElement) {
      logger.info('Успех! TargetXPath найден, завершаем работу.');
      await newPage.close();
      return true;
    }

    if (!targetElement) {
      const networkBlockSelector = '::-p-xpath(//div[@class="block"]//div[@class="block"]//div[@class="block mt-8"])';
      const networkDivSelector = '::-p-xpath(//div[@class="block"]//div[@class="block"]//div[contains(@class,"widget-has-ant-input")]//div[text()="Network"])';
      const addButtonSelector = '::-p-xpath(//div[@class="block"]//div[@class="mt-[120px] block"]//button//span[text()="Add Custom Network"])';
      const confirmButtonSelector = '::-p-xpath(//button[@class="ant-btn ant-btn-primary ant-btn-lg ant-btn-block"]//span[text()="Add Custom Network"])';

      const networkBlockExists = await newPage.$(networkBlockSelector);
      if (networkBlockExists) {
        await clickButton(networkDivSelector);
      } else {
        await clickButton(addButtonSelector);
        const confirmButton = await newPage.waitForSelector(confirmButtonSelector, { timeout: 5000 });
        if (confirmButton) {
          await confirmButton.click();
        }
      }
    }

    await delay(5000);

    const headingSelector = '::-p-xpath(//div[contains(@class, "eading-[18px] font-medium")])';
    const inputSelector = '::-p-xpath(//div[@class="px-[20px]"]//input)';
    const chainItemSelector = '::-p-xpath(//div[contains(@class, "chain-list-item")])';
    const confirmNetworkSelector = '::-p-xpath(//button[contains(@class, "ant-btn-lg w-[172px]")])';

    await clickButton(headingSelector);
    const inputField = await newPage.waitForSelector(inputSelector, { timeout: 5000 });
    if (inputField) {
      await inputField.type(chainID);
      await delay(2000);
    }
    await clickButton(chainItemSelector);
    await clickButton(confirmNetworkSelector);

    const finalCheck = await newPage.waitForSelector(`::-p-xpath(${targetxpath})`, { timeout: 10000 }).catch(() => null);

    if (finalCheck) {
      logger.info('Успех! TargetXPath найден, завершаем работу.');
      await newPage.close();
      return true;
    } else {
      logger.error('Ошибка! TargetXPath не найден после всех действий.');
      await newPage.close();
      return false;
    }
  } catch (error) {
    logger.error(`Ошибка во время выполнения: ${error.message}`);
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
    