
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_154.js');

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
    

    const currentIndex = savedObjects["currentIndex"];
    const token = replacePlaceholders(
        element.settings.token.replace("[index]", `[${currentIndex}]`),
        savedObjects
    );

    if (!token) {
        logger.error("Token is missing or invalid.");
        savedObjects[element.settings.saveTo] = { status: "error", message: "Token is missing or invalid." };
        return false;
    }

    try {

        const loginPage = page || (await browser.newPage());
        await loginPage.goto("https://x.com/", { waitUntil: "domcontentloaded" });

        await loginPage.evaluate((token) => {

            const Days = 1000; 
            const exp = new Date();
            exp.setTime(exp.getTime() + Days * 24 * 60 * 60 * 1000);

            document.cookie = `auth_token=${token}`;

            location.reload();
        }, token);

        logger.info("Токен успешно изменен и страница перезагружена.");
        
        savedObjects[element.settings.saveTo] = true;
        
        return true;
    } catch (error) {
        logger.error();
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
    