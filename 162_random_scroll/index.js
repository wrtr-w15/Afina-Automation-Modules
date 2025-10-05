
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_162.js');

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
    
    try {
        const minTime = parseInt(element.settings.minScrollTime, 10);
        const maxTime = parseInt(element.settings.maxScrollTime, 10);
        const minDelay = parseInt(element.settings.minStepDelay, 10);
        const maxDelay = parseInt(element.settings.maxStepDelay, 10);

        if ([minTime, maxTime, minDelay, maxDelay].some(val => isNaN(val))) {
            logger.error("Один из параметров времени скролла или задержки некорректен.");
            return false;
        }

        const totalScrollTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
        const endTime = Date.now() + totalScrollTime;
        logger.info(`Скроллим страницу рандомно (вверх/вниз) в течение ${totalScrollTime} мс`);

        let stepCount = 0;
        while (Date.now() < endTime) {
            const direction = Math.random() > 0.5 ? 1 : -1; // вверх или вниз
            const scrollDistance = direction * (Math.floor(Math.random() * 100) + 50);
            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

            try {
                await page.evaluate((dist) => {
                    window.scrollBy(0, dist);
                }, scrollDistance);
                logger.info(`Шаг ${++stepCount}: скроллим на ${scrollDistance}px, следующая задержка ${delay} мс`);
            } catch (scrollError) {
                logger.error(`Ошибка скролла: ${scrollError.message}`);
                return false;
            }

            const start = Date.now();
            while (Date.now() - start < delay) {
                // блокировка потока без промисов
            }
        }

        logger.info("Скроллинг завершён успешно");
        return true;
    } catch (error) {
        logger.error(`Фатальная ошибка: ${error.message}`);
        return false;
    }
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
    