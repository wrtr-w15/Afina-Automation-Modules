
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_184.js');

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
    
    // ВАЖНО: в allowFunctions должны быть разрешены: ["page.evaluate"]
    const replacePlaceholders = (str, ctx) =>
        typeof str === "string" ? str.replace(/\$\{(.*?)\}/g, (_, v) => (ctx[v] ?? "")) : str;

    try {
        logger.info("Читаем localStorage.getItem('signature')");

        // 1) получаем строку из localStorage
        const rawValue = await page.evaluate(() => window.localStorage.getItem("signature"));
        if (!rawValue) {
            logger.error("Значение для 'signature' не найдено в localStorage.");
            return false;
        }

        // 2) парсим JSON
        let obj;
        try {
            obj = JSON.parse(rawValue);
        } catch (e) {
            logger.error("Ошибка парсинга JSON из localStorage: " + e.message);
            // если нужно — сохраним сырьё
            const saveToRaw = replacePlaceholders(element.settings.saveToRaw, savedObjects) || "signatureRaw";
            savedObjects[saveToRaw] = rawValue;
            return false;
        }

        // 3) определяем outerKey (если не задан — берём первый)
        const providedOuterKey = replacePlaceholders(element.settings.outerKey, savedObjects);
        const keys = Object.keys(obj);
        if (keys.length === 0) {
            logger.error("Объект 'signature' пуст.");
            return false;
        }
        const outerKey = providedOuterKey && obj.hasOwnProperty(providedOuterKey)
            ? providedOuterKey
            : keys[0];

        const inner = obj[outerKey] || {};
        const pk = inner.pk ?? null;
        const seed = inner.seed ?? null;

        // 4) имена переменных из настроек (с подстановкой savedObjects), с дефолтами
        const saveToPk   = replacePlaceholders(element.settings.saveToPk, savedObjects)   || `signature_${outerKey}_pk`;
        const saveToSeed = replacePlaceholders(element.settings.saveToSeed, savedObjects) || `signature_${outerKey}_seed`;
        const saveToKey  = replacePlaceholders(element.settings.saveToOuterKey, savedObjects) || `signature_outerKey`;
        const saveToRaw  = replacePlaceholders(element.settings.saveToRaw, savedObjects)  || `signatureRaw`;

        // 5) сохраняем по отдельности
        savedObjects[saveToPk] = pk;
        savedObjects[saveToSeed] = seed;
        savedObjects[saveToKey] = outerKey;
        savedObjects[saveToRaw] = rawValue;

        logger.info(`Сохранено: ${saveToPk}=${pk}`);
        logger.info(`Сохранено: ${saveToSeed}=${seed}`);
        logger.info(`Сохранено: ${saveToKey}=${outerKey}`);
        logger.info(`Сохранено: ${saveToRaw}=[raw JSON]`);

        // можно вернуть также true/false по наличию значений
        return pk !== null || seed !== null;
    } catch (error) {
        logger.error(`Ошибка при чтении localStorage: ${error.message}`);
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
    