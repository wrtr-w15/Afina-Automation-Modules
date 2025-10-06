
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_55.js');

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
    
    logger.info("Starting enhanced percentage calculation module");

    try {
        const inputNumber = parseFloat(replacePlaceholders(element.settings.inputNumber, savedObjects));
        const percentageType = element.settings.percentageType; 
        const maxDecimals = parseInt(element.settings.maxDecimals, 10) || 2; 
        let calculatedPercentage;

        if (isNaN(inputNumber)) {
            logger.error("Invalid input number");
            return false;
        }

        if (!percentageType) {
            logger.error("Percentage type is not selected");
            return false;
        }

        if (percentageType === "fixed") {
            const fixedPercentage = parseFloat(replacePlaceholders(element.settings.fixedPercentage, savedObjects));
            if (isNaN(fixedPercentage)) {
                logger.error("Invalid fixed percentage");
                return false;
            }
            calculatedPercentage = (inputNumber * fixedPercentage) / 100;
        } else if (percentageType === "random") {
            const randomPercentageFrom = parseFloat(replacePlaceholders(element.settings.randomPercentageFrom, savedObjects));
            const randomPercentageTo = parseFloat(replacePlaceholders(element.settings.randomPercentageTo, savedObjects));

            if (isNaN(randomPercentageFrom) || isNaN(randomPercentageTo) || randomPercentageFrom > randomPercentageTo) {
                logger.error("Invalid random percentage range");
                return false;
            }
            const randomPercentage = randomPercentageFrom + Math.random() * (randomPercentageTo - randomPercentageFrom);
            calculatedPercentage = (inputNumber * randomPercentage) / 100;
        } else {
            logger.error("Invalid percentage type");
            return false;
        }

        // Round to the specified number of decimal places
        calculatedPercentage = parseFloat(calculatedPercentage.toFixed(maxDecimals));

        savedObjects[element.settings.saveTo] = calculatedPercentage;

        logger.info(`Calculated percentage: ${calculatedPercentage}`);
        return true;
    } catch (error) {
        logger.error(`Error during percentage calculation: ${error.message}`);
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
    