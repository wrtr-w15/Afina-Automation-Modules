
// Import module functions
const { waitForTargetTab } = require('./func_38.js');
const { handleAdd } = require('./func_40.js');
const { handleConnect } = require('./func_39.js');
const { handleSign } = require('./func_58.js');
const { clickRabby } = require('./func_71.js');
const { selectGas } = require('./func_74.js');
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_156.js');

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
    
    const action = element.settings.action;
    const tabTimeout = parseInt(replacePlaceholders(element.settings.tabTimeout || "15000", savedObjects), 10) || 15000;
    const elementTimeout = parseInt(replacePlaceholders(element.settings.elementTimeout || "10000", savedObjects), 10) || 10000;
    const repeatCount = parseInt(replacePlaceholders(element.settings.repeatCount || "1", savedObjects), 10) || 1;
    const extensionId = "acmacodkjbdgmoleebolmdjonilkdbch";

    const useCustomGas = element.settings.useCustomGas === true;
    const gasSpeed = element.settings.gasSpeed || "normal";
    const gasValue = replacePlaceholders(element.settings.customGasValue, savedObjects);

    const originalPage = page;
    const targetPage = await waitForTargetTab(browser, extensionId, tabTimeout, logger);

    switch (action) {
        case "connect":
            await handleConnect(targetPage, elementTimeout, logger);
            break;

        case "add":
            await handleAdd(targetPage, elementTimeout, logger);
            break;

        case "sign":
            if (useCustomGas) {
                await selectGas(targetPage, gasSpeed, gasValue, elementTimeout, logger);
            }
            await handleSign(targetPage, elementTimeout, logger, repeatCount, originalPage, extensionId, tabTimeout);
            break;

        case "rbconnect":
            try {
                await clickRabby(targetPage, elementTimeout, logger);
            } catch (error) {
                logger.error(`Ошибка в clickRabby: ${error.message}`);
            }

            try {
                await handleConnect(targetPage, elementTimeout, logger);
            } catch (error) {
                logger.error(`Ошибка в handleConnect: ${error.message}`);
            }
            break;

        default:
            throw new Error(`Unknown action: ${action}`);
    }

    await originalPage.bringToFront();
    logger.info("Returned to original page");

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
    