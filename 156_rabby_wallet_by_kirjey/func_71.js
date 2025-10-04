const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_156.js');

async function clickRabby(page, timeout, logger) {
    const selector = '::-p-xpath(//*[text()="Rabby Wallet"])';
    const addButton = await page.waitForSelector(selector, { timeout });
    if (!addButton) throw new Error("Add button not found");

    await addButton.click();
    logger.info("Clicked 'Rabby Wallet'");
    await delay(1000);
}

// Function exports
module.exports.clickRabby = clickRabby;