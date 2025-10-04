const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_156.js');

async function handleAdd(page, timeout, logger) {
    const selector = '::-p-xpath(//span[text()="Add"])';
    const addButton = await page.waitForSelector(selector, { timeout });
    if (!addButton) throw new Error("Add button not found");

    await addButton.click();
    logger.info("Clicked 'Add'");
    await delay(1000);
}

// Function exports
module.exports.handleAdd = handleAdd;