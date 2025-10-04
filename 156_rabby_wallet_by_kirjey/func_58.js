const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_156.js');

async function handleSign(page, timeout, logger, repeatCount, originalPage, extensionId, tabTimeout) {
  const selector = '::-p-xpath(//button[not(@disabled) and @type="button" and contains(@class, "ant-btn") and contains(@class, "ant-btn-primary") and span[text()="Sign"]])';
  const selectorConfrim = '::-p-xpath(//button[text()="Confirm"])';

  const blockExecution = (ms) => {
    const start = Date.now();
    while (Date.now() - start < ms) {}
  };

  for (let i = 0; i < repeatCount; i++) {
    // 🔁 Обновляем page на каждой итерации
    const activePage = (await browser.pages()).find(p => p.url().includes(extensionId));
    if (!activePage) throw new Error("Extension tab not found or closed");

    const signButton = await activePage.waitForSelector(selector, { timeout });
    if (!signButton) throw new Error("Sign button not found");
    await signButton.click();

    const signButtonConfirm = await activePage.waitForSelector(selectorConfrim, { timeout });
    blockExecution(200);
    if (!signButtonConfirm) throw new Error("Confirm button not found");
    await signButtonConfirm.click();
    blockExecution(200);

    logger.info(`Clicked 'Sign' (${i + 1}/${repeatCount})`);

    if (i < repeatCount - 1) {
      blockExecution(2000);
      await originalPage.bringToFront();
      blockExecution(6000);
      await waitForTargetTab(browser, extensionId, parseInt(tabTimeout), logger);
    }
  }
}

// Function exports
module.exports.handleSign = handleSign;