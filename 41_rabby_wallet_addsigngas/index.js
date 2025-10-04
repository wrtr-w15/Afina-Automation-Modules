
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_41.js');

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
    const selectors = {
        selectorIgnoreAll: `::-p-xpath(//span[text()="Ignore all"])`,
        selectorConnect: `::-p-xpath(//button[not(@disabled)]//span[contains(text(), "Connect")])`,
        selectorSign: `::-p-xpath(//button[not(@disabled)]//span[contains(text(), "Sign")])`,
        selectorConfirm: `::-p-xpath(//div//button[contains(text(), "Confirm")][not(@disabled)])`
    };

    let notificationPage = await waitForPage(browser, extensionId);
    if (!notificationPage) {
        logger.error('Notification page not found.');
        return false;
    }

    delayBlocking(2000);  // Small blocking delay before element checks.

    // Check for 'Ignore all' and click if found
    if (await checkAndClick(notificationPage, selectors.selectorIgnoreAll, '"Ignore all"')) {
        delayBlocking(1000);  // Blocking delay after clicking 'Ignore all'
    }

    // Check and click 'Connect'
    if (await checkAndClick(notificationPage, selectors.selectorConnect, '"Connect"')) {
        delayBlocking(2000);  // Blocking delay after clicking 'Connect'
        savedObjects[element.settings.saveTo] = true;
    } else {
        logger.error('"Connect" button not found.');
        return false;
    }

    // Check critical elements: 'Sign' and 'Confirm'
    for (let criticalSelector of [selectors.selectorSign, selectors.selectorConfirm]) {
        await checkAndClick(notificationPage, criticalSelector, `critical element: ${criticalSelector}`);
    }

    logger.info('Sequence completed successfully.');
    return true;

    // Blocking delay function
    function delayBlocking(ms) {
        const start = Date.now();
        while (Date.now() - start < ms) {
            // Blocking execution for the specified time
        }
    }

    // Generic function to find and click an element
    async function checkAndClick(page, selector, description) {
        const elementHandle = await page.$(selector);
        if (elementHandle) {
            logger.info(`Clicking ${description}`);
            await elementHandle.click();
            return true;
        } else {
            logger.info(`${description} not found.`);
            return false;
        }
    }

    // Waiting for the extension page
    async function waitForPage(browser, extensionId) {
        for (let attempt = 0; attempt < 10; attempt++) {
            const pages = await browser.pages();
            const targetPage = pages.find(p => p.url().includes(extensionId));
            if (targetPage) {
                logger.info('Notification page found.');
                return targetPage;
            }
            logger.info(`Attempt ${attempt + 1}: Notification page not found, retrying...`);
            delayBlocking(1000);
        }
        return null;
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
    