const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_156.js');

async function handleConnect(page, timeout, logger) {
    const ignoreSelector = '::-p-xpath(//span[text()="Ignore all"])';
    const connectSelector = '::-p-xpath(//span[contains(text(), "Connect")])';
    const connectSelectorNotDisabled = '::-p-xpath(//button[not(@disabled)]//span[contains(text(), "Connect")])';

    await delay(500);

    try {
        const ignoreButton = await page.waitForSelector(ignoreSelector, { timeout });
        if (ignoreButton) {
            await delay(500);
            await ignoreButton.click();
            logger.info("Clicked 'Ignore all'");
            await delay(500);
        }
    } catch (e) {
        logger.info("'Ignore all' not found, continuing with connect");
    }

    try {
        const connectButton = await page.waitForSelector(connectSelectorNotDisabled, { timeout });
        if (connectButton) {
            await connectButton.click();
            logger.info("Clicked 'Connect' (not disabled)");
        } else {
            // fallback in case the non-disabled selector fails
            const fallbackConnect = await page.waitForSelector(connectSelector, { timeout });
            if (fallbackConnect) {
                await fallbackConnect.click();
                logger.info("Clicked 'Connect' (fallback)");
            } else {
                throw new Error("Connect button not found at all");
            }
        }
    } catch (e) {
        logger.error(`Failed to click 'Connect': ${e.message}`);
        throw e;
    }

    await delay(500);
}

// Function exports
module.exports.handleConnect = handleConnect;