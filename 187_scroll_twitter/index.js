
// Import module functions
const { humanMouseClickToElement } = require('./func_79.js');
const { scrollAndViewTweets } = require('./func_80.js');
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_187.js');

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
    
  const replacePlaceholders = (str) => {
    return str.replace(/\$\{(.*?)\}/g, (_, variable) => savedObjects[variable] || variable);
  };

  const startIndex = parseInt(
    replacePlaceholders(element.settings.startIndex, savedObjects),
    10
  );

  const saveTo = element.settings.saveTo || "lastTweetIndex";

  const lastIndex = await scrollAndViewTweets(
    page,
    element,
    logger,
    savedObjects,
    startIndex,
    saveTo
  );

  logger.info(`📍 Финальный индекс: ${lastIndex}`);

  // 🔕 Блок клика по лайку удалён по запросу

  logger.info(`✅ Скрипт завершён без взаимодействий с элементами.`);
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
    