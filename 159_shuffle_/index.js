
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_159.js');

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
    
    logger.info("Starting advanced value selection module with mandatory inclusion and shuffling");

    try {
        // Parse values from the textarea
        const inputValues = replacePlaceholders(element.settings.values, savedObjects);
        const lines = inputValues
            .split('
')
            .map(line => line.trim())
            .filter(line => line);

        // Parse each line into {flag, name}, ignoring empty or invalid values
        const parsedValues = lines
            .map(line => {
                const parts = line.split(':');
                if (parts.length < 2) return null;

                const flagRaw = replacePlaceholders(parts[0].trim(), savedObjects);
                const flag = flagRaw ? parseInt(flagRaw, 10) : null;

                const nameRaw = replacePlaceholders(parts.slice(1).join(':').trim(), savedObjects);
                const name = nameRaw && nameRaw.trim() ? nameRaw.trim() : null;

                if (!flag || !name) return null; // Exclude invalid or empty entries
                return { flag, name };
            })
            .filter(item => item); // Filter out invalid or empty entries

        if (parsedValues.length === 0) {
            logger.error("No valid values provided");
            return false;
        }

        // Separate values into priority (flag = 2) and selectable (flag = 1)
        const priorityValues = parsedValues.filter(item => item.flag === 2);
        const selectableValues = parsedValues.filter(item => item.flag === 1);

        if (priorityValues.length === 0 && selectableValues.length === 0) {
            logger.error("No valid values with flag 1 or 2");
            return false;
        }

        const selectionType = element.settings.selectionType;
        const result = [];

        // Always include priority values
        result.push(...priorityValues.map(item => item.name));

        if (selectionType === "fixed") {
            // Shuffle selectable values and add to the result
            const shuffledSelectable = selectableValues.sort(() => Math.random() - 0.5);
            result.push(...shuffledSelectable.map(item => item.name));
        } else if (selectionType === "random") {
            const count = parseInt(element.settings.randomCount, 10);
            if (isNaN(count) || count <= 0) {
                logger.error("Invalid random count");
                return false;
            }
            // Select specified number of random values, ensuring priority values are included
            const shuffledSelectable = selectableValues.sort(() => Math.random() - 0.5);
            const selected = shuffledSelectable.slice(0, Math.max(0, count - priorityValues.length));
            result.push(...selected.map(item => item.name));
        } else if (selectionType === "randomRange") {
            const min = parseInt(element.settings.randomRangeMin, 10);
            const max = parseInt(element.settings.randomRangeMax, 10);
            if (isNaN(min) || isNaN(max) || min > max || min <= 0) {
                logger.error("Invalid random range");
                return false;
            }
            // Determine a random count within range
            const count = Math.floor(Math.random() * (max - min + 1)) + min;
            const shuffledSelectable = selectableValues.sort(() => Math.random() - 0.5);
            const selected = shuffledSelectable.slice(0, Math.max(0, count - priorityValues.length));
            result.push(...selected.map(item => item.name));
        } else {
            logger.error("Invalid selection type");
            return false;
        }

        // Shuffle the final result to mix priority and other values
        const finalResult = result.sort(() => Math.random() - 0.5).join(";");
        savedObjects[element.settings.saveTo] = finalResult;

        logger.info(`Final selected values: ${finalResult}`);
        return true;
    } catch (error) {
        logger.error(`Error during value selection: ${error.message}`);
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
    