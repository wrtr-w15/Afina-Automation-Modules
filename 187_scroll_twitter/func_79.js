const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_187.js');

async function humanMouseClickToElement(page, element, logger) {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const box = await element.boundingBox();

  if (!box) {
    logger.error(`❌ Не удалось получить координаты элемента`);
    return false;
  }

  const targetX = box.x + Math.random() * box.width;
  const targetY = box.y + Math.random() * box.height;

  const viewport = page.viewportSize?.() || { width: 1280, height: 720 };
  const startX = Math.random() * viewport.width;
  const startY = Math.random() * viewport.height;

  const controlX = (startX + targetX) / 2 + (Math.random() - 0.5) * 200;
  const controlY = (startY + targetY) / 2 + (Math.random() - 0.5) * 200;

  await page.evaluate(() => {
    if (!document.querySelector('#fake-cursor')) {
      const cursor = document.createElement('div');
      cursor.id = 'fake-cursor';
      cursor.style.cssText = `
        position: fixed;
        width: 12px;
        height: 12px;
        background: red;
        border-radius: 50%;
        z-index: 999999;
        pointer-events: none;
      `;
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

  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * targetX;
    const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * targetY;
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

    await delay(10 + Math.random() * 20);
  }

  await page.mouse.click(targetX, targetY);

  logger.info(`🖱️ Мышь переместилась и кликнула по элементу.`);
  return true;
}

// Function exports
module.exports.humanMouseClickToElement = humanMouseClickToElement;