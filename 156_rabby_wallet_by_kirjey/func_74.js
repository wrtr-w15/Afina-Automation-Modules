const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_156.js');

async function selectGas(page, gasSpeed, gasValue, timeout, logger) {
  const openMenuXPath = '::-p-xpath(//div[contains(@class,"rabby-MenuButtonStyled")])';
  const gasMenuButton = await page.waitForSelector(openMenuXPath, { timeout });

  if (!gasMenuButton) throw new Error("Gas menu button not found");

  await gasMenuButton.click();
  logger.info("Gas menu opened");
  await delay(500); // Ждём отрисовку меню

  const capitalized = gasSpeed.charAt(0).toUpperCase() + gasSpeed.slice(1);
  const levelXPath = `::-p-xpath(//div[contains(@class,"rabby-LevelTextStyled") and normalize-space(text())="${capitalized}"])`;

  const levelOption = await page.waitForSelector(levelXPath, { timeout, visible: true });
  if (!levelOption) throw new Error(`Gas level option '${capitalized}' not found or not visible`);

  await levelOption.click();
  logger.info(`Clicked gas level: ${capitalized}`);
  await delay(300);

  if (gasSpeed === 'Custom') {
    const inputXPath = '::-p-xpath(//div[contains(@class,"cardTitle")]//input)';
    const gasInput = await page.waitForSelector(inputXPath, { timeout, visible: true });  
    await delay(1500);

    if (!gasInput) throw new Error("Custom gas input field not found or not visible");

    await gasInput.click({ clickCount: 3 });
    await page.keyboard.type(String(gasValue));
    await delay(4000);
    logger.info(`Custom gas value entered: ${gasValue}`);

    // Click Confirm
    const confirmXPath = '::-p-xpath(//button[span[text()="Confirm"]])';
    const confirmButton = await page.waitForSelector(confirmXPath, { timeout, visible: true });

    if (!confirmButton) throw new Error("Confirm button not found after custom gas input");

    await confirmButton.click();
    logger.info("Clicked Confirm button after custom gas entry");
    await delay(2500);

    const customConfirmedXPath = '::-p-xpath(//div[contains(@class,"rabby-MenuButtonStyled") and span[text()="Custom"]])';
    const confirmedElement = await page.waitForSelector(customConfirmedXPath, { timeout: 3000 }).catch(() => null);

    if (!confirmedElement) {
      logger.error("Custom gas not confirmed in UI");
      return false;
    }

    logger.info("Custom gas confirmed in UI");
  }

  await delay(500);
  return true;
}

// Function exports
module.exports.selectGas = selectGas;