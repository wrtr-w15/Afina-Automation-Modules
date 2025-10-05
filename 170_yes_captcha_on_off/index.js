
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_170.js');

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
    
  const extensionUrl = "chrome-extension://jiofmdifioeejeilfkpegipdjiopiekl/popup/index.html";
  const toggleAction = element.settings.toggleAction; // "On" или "Off"

  const originalPage = page;
  let extensionPage = null;
  let openedNewTab = false;

  const pages = await browser.pages();
  extensionPage = pages.find(p => p.url().includes("jiofmdifioeejeilfkpegipdjiopiekl"));

  if (!extensionPage) {
    logger.info("Extension page not found. Opening new tab...");
    extensionPage = await browser.newPage();
    openedNewTab = true;
    await extensionPage.goto(extensionUrl, { waitUntil: "domcontentloaded" });
  }

  await extensionPage.bringToFront();

  const checkboxXPath = '//div[@class="header"]//div[@class="switch"]//span[contains(@class, "Mui-checked")]/input[@type="checkbox"]';
  const uncheckedXPath = '//div[@class="header"]//div[@class="switch"]//span[not(contains(@class, "Mui-checked"))]/input[@type="checkbox"]';

  const isOn = await extensionPage.$(`::-p-xpath(${checkboxXPath})`) !== null;

  if ((toggleAction === "On" && !isOn) || (toggleAction === "Off" && isOn)) {
    const toggleXPath = isOn ? checkboxXPath : uncheckedXPath;
    const toggleHandle = await extensionPage.$(`::-p-xpath(${toggleXPath})`);
    if (toggleHandle) {
      await toggleHandle.click();
      logger.info(`Switch toggled ${toggleAction}`);
    } else {
      logger.error("Toggle element not found for switching.");
    }
  } else {
    logger.info(`Already in desired state: ${toggleAction}`);
  }

  // Вернуться на исходную вкладку
  await originalPage.bringToFront();
  logger.info("Returned to original tab");

  // Закрыть вкладку, если мы её открывали
  if (openedNewTab) {
    await delay(300);
    await extensionPage.close();
    logger.info("Closed extension tab");
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
    