
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_62.js');

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
    
    logger.info("Starting Discord login via token");

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
        await loginPage.goto("https://discord.com/login", { waitUntil: "domcontentloaded" });

        await loginPage.evaluate((token) => {
            const iframe = document.createElement("iframe");
            document.body.appendChild(iframe);
            iframe.contentWindow.localStorage.setItem("token", `"${token}"`);
            setTimeout(() => {
                location.reload();
            }, 1000);
        }, token);


        await delay(5000); 

        const isLoggedIn = await loginPage.evaluate(() => {
            return window.localStorage.getItem("token") !== null;
        });

        if (isLoggedIn) {
            const username = await loginPage.evaluate(() => {
                return document.querySelector("[aria-label='User Settings']")?.textContent || "Unknown User";
            });

            logger.info(`Login successful for user: ${username}`);
            savedObjects[element.settings.saveTo] = {
                status: "success",
                message: "Login successful",
                user: username,
            };
            await loginPage.close();
            return true;
        } else {
            throw new Error("Login verification failed");
        }
    } catch (error) {
        logger.error(`Error during Discord login: ${error.message}`);
        savedObjects[element.settings.saveTo] = {
            status: "error",
            message: `Error during Discord login: ${error.message}`,
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
    