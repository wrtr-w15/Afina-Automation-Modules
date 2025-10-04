
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_38.js');

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
    
    logger.info("Starting random selection module");

    // Получаем настройки из element.settings
    const Spot = parseInt(element.settings.Spot, 10) || 0;
    const Derivatives = parseInt(element.settings.Derivatives, 10) || 0;
    const TradingBot = parseInt(element.settings.TradingBot, 10) || 0;
    const LiderBoard = parseInt(element.settings.LiderBoard, 10) || 0;
    const PositionBuilder = parseInt(element.settings.PositionBuilder, 10) || 0;
    const Earn = parseInt(element.settings.Earn, 10) || 0;
    const Lifestream = parseInt(element.settings.Lifestream, 10) || 0;
    const Settings = parseInt(element.settings.Settings, 10) || 0;
    const AssetsTrading = parseInt(element.settings.AssetsTrading, 10) || 0;
    const RandomMakeItHot = parseInt(element.settings.RandomMakeItHot, 10) || 0;
    const saveTo = element.settings.saveTo;

    if (RandomMakeItHot <= 0) {
        logger.warn("RandomMakeItHot is less than or equal to 0. Returning empty result.");
        savedObjects[saveTo] = "";
        return "";
    }

    if (!saveTo) {
        logger.error("SaveTo field is not defined.");
        return false;
    }

    // Создание списка активных задач
    let activeOptions = [];
    if (Spot === 1) activeOptions.push("Spot");
    if (Derivatives === 1) activeOptions.push("Derivatives");
    if (TradingBot === 1) activeOptions.push("TradingBot");
    if (LiderBoard === 1) activeOptions.push("LiderBoard");
    if (PositionBuilder === 1) activeOptions.push("PositionBuilder");
    if (Earn === 1) activeOptions.push("Earn");
    if (Lifestream === 1) activeOptions.push("Lifestream");
    if (Settings === 1) activeOptions.push("Settings");
    if (AssetsTrading === 1) activeOptions.push("AssetsTrading");

    // Проверка на случай отсутствия активных задач
    if (!Array.isArray(activeOptions) || activeOptions.length === 0) {
        logger.warn("No active tasks available. Returning empty result.");
        savedObjects[saveTo] = "";
        return "";
    }

    // Выбор случайных задач
    const selectedTasks = [];
    while (selectedTasks.length < RandomMakeItHot && activeOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * activeOptions.length);
        const chosenOption = activeOptions.splice(randomIndex, 1)[0];
        selectedTasks.push(chosenOption);
    }

    // Формирование строки результата
    const result = selectedTasks.join(";");

    // Сохранение результата
    savedObjects[saveTo] = result;

    logger.info(`Tasks to execute: ${result}`);
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
    