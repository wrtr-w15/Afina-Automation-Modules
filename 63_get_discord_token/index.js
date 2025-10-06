
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_63.js');

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
    
    logger.info("Starting Discord token fetch using Webpack command");

    try {
        const loginPage = page || (await browser.newPage());
        await loginPage.goto("https://discord.com/login", { waitUntil: "domcontentloaded" });
        const token = await loginPage.evaluate(() => {
            try {
                return (webpackChunkdiscord_app.push([[''], {}, e => {
                    m = [];
                    for (let c in e.c) m.push(e.c[c]);
                }]), m).find(m => m?.exports?.default?.getToken !== void 0).exports.default.getToken();
            } catch (error) {
                return null; 
            }
        });

        if (token) {
            logger.info("Token successfully fetched");
            savedObjects[element.settings.saveTo] = {
                status: "success",
                token: token,
                message: "Token successfully retrieved"
            };
            await loginPage.close();
            return true;
        } else {
            logger.error("Failed to fetch the token using the Webpack command.");
            savedObjects[element.settings.saveTo] = {
                status: "error",
                message: "Failed to fetch the token using the Webpack command."
            };
            await loginPage.close();
            return false;
        }
    } catch (error) {
        logger.error(`Error during token fetch: ${error.message}`);
        savedObjects[element.settings.saveTo] = {
            status: "error",
            message: `Error during token fetch: ${error.message}`
        };
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
    