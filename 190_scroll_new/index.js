
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_190.js');

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
    
  logger.info("⏬ Запуск скрипта прокрутки к элементу");

  const settings = {
    minSpeed: parseInt(replacePlaceholders(element.settings.minSpeed || "10", savedObjects), 10),
    maxSpeed: parseInt(replacePlaceholders(element.settings.maxSpeed || "30", savedObjects), 10),
    jitterChance: parseFloat(replacePlaceholders(element.settings.jitterChance || "0.2", savedObjects)),
    overshootMin: parseInt(replacePlaceholders(element.settings.overshootMin || "30", savedObjects), 10),
    overshootMax: parseInt(replacePlaceholders(element.settings.overshootMax || "70", savedObjects), 10),
    centerOffset: parseInt(replacePlaceholders(element.settings.centerOffset || "0", savedObjects), 10),
    stepDivisor: parseInt(replacePlaceholders(element.settings.stepDivisor || "20", savedObjects), 10),
    minSteps: parseInt(replacePlaceholders(element.settings.minSteps || "10", savedObjects), 10),
  };

  const rawXpath = replacePlaceholders(element.settings.xpathone, savedObjects);

  if (!rawXpath || !rawXpath.trim()) {
    logger.error("❌ XPath пустой или не задан");
    return false;
  }

  logger.info(`➡️ Прокрутка к XPath: ${rawXpath}`);

  const result = await page.evaluate(async (rawXpath, settings) => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const scrollToElement = async (targetElement) => {
      const rect = targetElement.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - (window.innerHeight / 2) + settings.centerOffset;

      const currentY = window.scrollY;
      const distance = targetY - currentY;
      const steps = Math.max(settings.minSteps, Math.abs(distance / settings.stepDivisor));

      const jitter = Math.random() < settings.jitterChance;

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const ease = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

        const newY = currentY + ease * distance;
        window.scrollTo(0, newY);

        const delay = settings.minSpeed + Math.random() * (settings.maxSpeed - settings.minSpeed);
        await sleep(delay);
      }

      if (jitter) {
        const overshoot = settings.overshootMin + Math.random() * (settings.overshootMax - settings.overshootMin);
        window.scrollBy(0, overshoot);
        await sleep(50 + Math.random() * 100);
        window.scrollBy(0, -overshoot / 1.5);
      }
    };

    // Ищем основной элемент
    let targetElement = document.evaluate(
      rawXpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    // Если не нашли — берем последний твит
    if (!targetElement) {
      console.warn("❌ Элемент по XPath не найден, ищем последний твит...");
      const tweets = document.evaluate(
        `//article[@data-testid='tweet']`,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      if (tweets.snapshotLength > 0) {
        targetElement = tweets.snapshotItem(tweets.snapshotLength - 1);
        console.warn(`⚠️ Прокрутка к последнему твиту (индекс ${tweets.snapshotLength - 1})`);
      }
    }

    if (targetElement) {
      await scrollToElement(targetElement);
      return true;
    } else {
      console.error("❌ Ни основной элемент, ни твиты не найдены");
      return false;
    }
  }, rawXpath, settings);

  if (result) {
    logger.info("✅ Прокрутка завершена");
  } else {
    logger.error("❌ Прокрутка не выполнена");
  }

  return result;
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
    