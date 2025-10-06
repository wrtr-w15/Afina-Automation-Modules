
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_171.js');

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
    
    const extensionUrl = "chrome-extension://dmkamcknogkgcdfhhbddcghachkejeap/popup.html#/?tokenChainId=osmosis-1&tokenCoinMinimalDenom=uosmo&isTokenDetailModalOpen=true";
    const listenTime = 5000;
    const saveTo = element.settings.saveTo;

    // Открываем новую вкладку расширения
    const targetPage = await browser.newPage();

    logger.info("Создана новая вкладка. Включаем перехват сетевых запросов...");

    // Слушаем все сетевые ответы
    targetPage.on("response", async (response) => {
        try {
            const contentType = response.headers()["content-type"] || "";
            if (!contentType.includes("application/json")) return;

            const body = await response.json();
            const text = JSON.stringify(body);

            // Поиск адреса Osmosis osmo1...
            const match = text.match(/osmo1[a-zA-Z0-9]{38}/); // osmo1 + 38 символов

            if (match && match[0]) {
                savedObjects[saveTo] = match[0];
                logger.info(`Найден адрес Osmosis: ${match[0]}`);
            }
        } catch (err) {
            logger.error("Ошибка при обработке ответа: " + err.message);
        }
    });

    // Переходим на страницу расширения
    await targetPage.goto(extensionUrl, { waitUntil: "domcontentloaded" });
    logger.info(`Переход на ${extensionUrl} выполнен.`);

    // Ждём сетевых событий
    logger.info(`Ожидаем ${listenTime} мс для сбора сетевых данных...`);

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
    