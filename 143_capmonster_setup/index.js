
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_143.js');

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
    
  const extensionUrl = "chrome-extension://pabjfbciaedomjjfelfafejkppknjleh/popup.html";
  await page.goto(extensionUrl, { waitUntil: "domcontentloaded" });

  const api = replacePlaceholders(element.settings.apiKey, savedObjects);
  const selectors = element.settings;

  const checkboxes = [
    { name: "recaptcha2", label: "ReCaptcha2" },
    { name: "recaptcha3", label: "ReCaptcha3" },
    { name: "rcEnterprise", label: "ReCaptchaEnterprise" },
    { name: "geetest", label: "GeeTest" },
    { name: "cloudflare", label: "Turnstile" },
    { name: "textCaptcha", label: "ImageToText" },
    { name: "blsCaptcha", label: "BLS" },
    { name: "binanceCaptcha", label: "Binance" }
  ];

  if (api) {
    const apiInput = '::-p-xpath(//input[@id="client-key-input"])';
    const saveButton = '::-p-xpath(//button[@id="client-key-save-btn"])';


    try {
      await page.focus(apiInput);
      // Очистка и ввод
      if (page.fill) {
        await page.fill(apiInput, "");
        await delay(100);
        await page.fill(apiInput, api);
      } else {
        for (let i = 0; i < 3; i++) {
          await page.$eval(apiInput, el => (el.value = ""));
          await delay(100);
        }
        await page.type(apiInput, api, { delay: 10 });
      }
    } catch (e) {
      logger.error("API input not found/focusable");
      return false;
    }

    await delay(300);

    const saveBtnHandle = await page.$(saveButton);
    if (!saveBtnHandle) {
      logger.error("Save button not found for API key.");
      return false;
    }
    await saveBtnHandle.click();
    await delay(600);

    try {
      const balanceSelector = '::-p-xpath(//span[@id="client-balance-or-error-text"])';
      // Лучше ждать через ручной цикл, если ваш движок не дружит с waitForSelector
      const spanHandle = await page.$(balanceSelector);
      if (!spanHandle) {
        logger.error("Balance span not found.");
        return false;
      }
      const balanceText = await spanHandle.evaluate(el => el.textContent.trim());

      if (!balanceText || balanceText.toLowerCase().includes("wrong key")) {
        logger.error("Invalid API key provided: 'Wrong key' detected.");
        return false;
      }

      const numeric = balanceText
        .replace(/\s/g, "")
        .replace(",", ".")
        .replace(/[^0-9.]/g, "");
      if (numeric === "" || Number.isNaN(Number(numeric))) {
        logger.error(`Balance is not a valid number: "${balanceText}"`);
        return false;
      }

      if (!selectors.saveTo) {
        logger.error("Field 'saveTo' is empty. Cannot store balance.");
        return false;
      }
      savedObjects[selectors.saveTo] = balanceText;
    } catch (err) {
      logger.error("Balance read failed: " + (err && err.message ? err.message : err));
      return false;
    }
  }

  for (const cb of checkboxes) {
    const isEnabled = !!selectors[cb.name];

    const xpathUncheckedLabel =
      `//label[contains(@class,"ant-checkbox-wrapper")` +
      ` and not(contains(@class,"ant-checkbox-wrapper-checked"))]` +
      `[.//input[@value="${cb.label}"]]`;

    const xpathCheckedLabel =
      `//label[contains(@class,"ant-checkbox-wrapper ant-checkbox-wrapper-checked")]` +
      `[.//input[@value="${cb.label}"]]`;

    if (isEnabled) {
      const toClick = await page.$(`::-p-xpath(${xpathUncheckedLabel})`);
      if (toClick) await toClick.click();
    } else {
      const toUnclick = await page.$(`::-p-xpath(${xpathCheckedLabel})`);
      if (toUnclick) await toUnclick.click();
    }
  }

  const repeatInput = await page.$('::-p-xpath(//input[@id="settings-repeat-solve-attempts"])');
  if (repeatInput) {
    await repeatInput.click();
    await delay(300);
    const repeatXpath = `//div[@class="ant-select-item-option-content" and text()="${selectors.repeatAttempt}"]`;
    const repeatOption = await page.$(`::-p-xpath(${repeatXpath})`);
    if (repeatOption) await repeatOption.click();
    else logger.error(`Repeat option "${selectors.repeatAttempt}" not found`);
  } else {
    logger.error("Repeat attempts input not found");
  }

  const manualOffToOn = await page.$('::-p-xpath(//button[@id="settings-manual-resolving-switch" and @aria-checked="false"])');
  const manualOnToOff = await page.$('::-p-xpath(//button[@id="settings-manual-resolving-switch" and @aria-checked="true"])');

  if (selectors.manualRecognition && manualOffToOn) await manualOffToOn.click();
  if (!selectors.manualRecognition && manualOnToOff) await manualOnToOff.click();

  if (selectors.recaptcha2) {
    if (selectors.recaptcha2Mode === "token") {
      const tokenRadio = await page.$('::-p-xpath(//label[span[text()="Token"]])');
      if (tokenRadio) {
        await tokenRadio.click();
        logger.info("Selected ReCaptcha2 mode: Token");
      } else {
        logger.error("Token radio button not found.");
      }
    } else if (selectors.recaptcha2Mode === "click") {
      const clickRadio = await page.$('::-p-xpath(//label[span[text()="Click"]])');
      if (clickRadio) {
        await clickRadio.click();
        logger.info("Selected ReCaptcha2 mode: Click");
      } else {
        logger.error("Click radio button not found.");
      }
    }
  }
  return savedObjects;
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
    