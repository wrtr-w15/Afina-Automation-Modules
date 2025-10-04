const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_156.js');

async function waitForTargetTab(browser, extensionId, timeout, logger) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const pages = await browser.pages();
        const targetPage = pages.find(p => p.url().includes(extensionId));
        if (targetPage) {
            await targetPage.bringToFront();
            logger.info("Target tab found and focused.");
            return targetPage;
        }
        await delay(700);
    }
    throw new Error("Target tab not found within timeout.");
}

// Function exports
module.exports.waitForTargetTab = waitForTargetTab;