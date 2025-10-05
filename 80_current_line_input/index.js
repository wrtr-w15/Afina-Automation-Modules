
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_80.js');

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
    
    // Получаем текст из настроек, обрабатывая переменные
    const text = replacePlaceholders(element.settings.text, savedObjects) || '';
    const interval = element.settings.interval || 100;

    // Проверка на пустой текст
    if (typeof text !== 'string' || text.trim() === '') {
        throw new Error('Invalid or empty text provided.');
    }

    logger.info(`Starting text input: "${text}" with interval ${interval}ms`);

    // Ввод текста по символам в активное поле
    for (let char of text) {
        await page.keyboard.type(char, { delay: interval });
    }

    logger.info(`Text input completed successfully.`);

    return `Text input completed: ${text}`;
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
    