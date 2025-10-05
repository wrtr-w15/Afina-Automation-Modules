
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_188.js');

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
    

    const xpath = `::-p-xpath(${replacePlaceholders(element.settings.xpath,savedObjects)})`;
     const targetElement = await page.$(xpath);

    if (!targetElement) {
        logger.error(`Элемент не найден по XPath: ${element.settings.xpath}`);
        return false;
    }

    const box = await targetElement.boundingBox();
    if (!box) {
        logger.error(`Не удалось получить размеры элемента.`);
        return false;
    }

    const targetX = box.x + Math.random() * box.width;
    const targetY = box.y + Math.random() * box.height;

    // Получаем размеры экрана
    const viewport = page.viewportSize?.() || { width: 1280, height: 720 };
    const startX = Math.random() * viewport.width;
    const startY = Math.random() * viewport.height;

    // Генерируем контрольную точку (середина пути + случайный изгиб)
    const controlX = (startX + targetX) / 2 + (Math.random() - 0.5) * 200;
    const controlY = (startY + targetY) / 2 + (Math.random() - 0.5) * 200;

    // Создаём кастомный курсор
    await page.evaluate(() => {
        if (!document.querySelector('#fake-cursor')) {
            const cursor = document.createElement('div');
            cursor.id = 'fake-cursor';
            cursor.style.position = 'fixed';
            cursor.style.width = '12px';
            cursor.style.height = '12px';
            cursor.style.background = 'red';
            cursor.style.borderRadius = '50%';
            cursor.style.zIndex = 999999;
            cursor.style.pointerEvents = 'none';
            document.body.appendChild(cursor);
        }
    });

    await page.mouse.move(startX, startY);
    await page.evaluate((x, y) => {
        const cursor = document.querySelector('#fake-cursor');
        if (cursor) {
            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
        }
    }, startX, startY);

    // Анимированное движение по кривой
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;

        // Квадратичная кривая Безье
        const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * targetX;
        const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * targetY;

        // Добавляем микросмещения (нервность)
        const jitterX = (Math.random() - 0.5) * 4;
        const jitterY = (Math.random() - 0.5) * 4;

        const finalX = x + jitterX;
        const finalY = y + jitterY;

        await page.mouse.move(finalX, finalY);
        await page.evaluate((x, y) => {
            const cursor = document.querySelector('#fake-cursor');
            if (cursor) {
                cursor.style.left = `${x}px`;
                cursor.style.top = `${y}px`;
            }
        }, finalX, finalY);

        // Задержка с варьирующейся скоростью
        await delay(10 + Math.random() * 20);
    }

    await page.mouse.click(targetX, targetY);

    logger.info(`Нелинейный клик: курсор пошёл из (${startX.toFixed(0)}, ${startY.toFixed(0)}) в (${targetX.toFixed(0)}, ${targetY.toFixed(0)}) через (${controlX.toFixed(0)}, ${controlY.toFixed(0)})`);
    return true;
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
    