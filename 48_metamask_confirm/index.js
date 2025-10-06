
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_48.js');

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
    
    const extensionId = "nkbihfbeogaeaoehlefnkodbefgpgknn";
    const previousPage = page;
    const retryCount = element.settings.retryCount || 5;  // Default to 5 retries if not set
    const retryDelay = element.settings.retryDelay || 3000;  // Default to 3 seconds if not set
    const buttonWaitDelay = element.settings.buttonWaitDelay || 5000;  // Default to 5 seconds for button wait

    let targetPage = null;

    // Retry logic to find the target page
    for (let attempt = 0; attempt < retryCount; attempt++) {
        const pages = await browser.pages();
        targetPage = pages.find(p => p.url().includes(extensionId));

        if (targetPage) {
            await targetPage.bringToFront();  // Switch to the target page
            break;
        } else {
            // Log each retry attempt and wait before trying again
            logger.info(`Attempt ${attempt + 1} of ${retryCount}: Page not found. Retrying in ${retryDelay / 1000} seconds...`);
            await delay(retryDelay);
        }
    }

    if (!targetPage) {
        logger.error(`Page with extension ID ${extensionId} not found after ${retryCount} attempts.`);
        return false;
    }

    // Define the possible button XPaths
    const buttonSelectors = [
        '::-p-xpath(//button[contains(@class, "mm-button-primary")])',
        '::-p-xpath(//button[@data-testid="confirm-footer-button"])',
        '::-p-xpath(//button[@data-testid="page-container-footer-next"])',
        '::-p-xpath(//button[@data-testid="confirm-btn"])',
        '::-p-xpath(//button[@data-testid="confirmation-submit-button"])',
        '::-p-xpath(//button[contains(@class, "button") and contains(@class, "btn--rounded") and contains(@class, "btn-primary") and @data-testid="page-container-footer-next"])'
    ];

    // Helper function to click any available button from the list
    async function clickAvailableButton() {
        for (const selector of buttonSelectors) {
            const button = await targetPage.$(selector);
            if (button) {
                await button.click();
                logger.info(`Clicked button with selector: ${selector}`);
                return true;
            }
        }
        return false;
    }

    try {
        let buttonClicked = true;

        // Continue clicking buttons as they appear, with up to `buttonWaitDelay` between each
        while (buttonClicked) {
            buttonClicked = await clickAvailableButton();
            if (buttonClicked) {
                // Wait up to `buttonWaitDelay` to see if another button appears
                await delay(buttonWaitDelay);
            }
        }

        // Switch back to the previous page if no more buttons appear
        await previousPage.bringToFront();
        logger.info("Switched back to the previous page.");
        
    } catch (error) {
        logger.error(`Error during button interaction: ${error.message}`);
        return false;
    }

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
    