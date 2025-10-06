const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_187.js');

async function scrollAndViewTweets(page, element, logger, savedObjects, startIndex, saveTo) {
  const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const minDelay = parseInt(element.settings.minDelay || 1200);
  const maxDelay = parseInt(element.settings.maxDelay || 2200);
  const stayMin = parseInt(element.settings.stayMin || 2500);
  const stayMax = parseInt(element.settings.stayMax || 4000);
  const interestChance = parseFloat(element.settings.interestChance || 0.4);
  const maxToView = parseInt(element.settings.maxPosts || 15);

  const previousData = savedObjects[saveTo] || {};
  const lastViewedId = previousData.lastViewedId || null;

  logger.info(`🌀 Начинаем просмотр твитов. Цель: ${maxToView}. Последний просмотренный ID: ${lastViewedId || 'нет'}`);

  const seenTweets = new Set();
  let viewedCount = 0;
  let foundLastViewed = !lastViewedId; // если нет id — начинаем сразу

  while (viewedCount < maxToView) {
    const tweetHandles = await page.$$(`::-p-xpath(//article[@data-testid='tweet'])`);
    logger.debug(`🔍 Найдено твитов на экране: ${tweetHandles.length}`);

    for (let i = 0; i < tweetHandles.length && viewedCount < maxToView; i++) {
      const tweet = tweetHandles[i];

      // Получаем "идентификатор" твита — можно заменить на data-tweet-id если будет доступен
      const tweetId = await page.evaluate(el => el.innerText.slice(0, 100), tweet);
      if (!tweetId || seenTweets.has(tweetId)) continue;

      seenTweets.add(tweetId);

      // Ждём, пока не достигнем последнего просмотренного твита
      if (!foundLastViewed) {
        if (tweetId === lastViewedId) {
          foundLastViewed = true;
          logger.info(`⏩ Найден последний просмотренный твит. Продолжаем с новых.`);
        } else {
          continue;
        }
      }

      const box = await tweet.boundingBox();
      if (!box) continue;

      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), box.y - 100);
      await delay(300);

      logger.info(`👁️ Просмотр твита #${viewedCount + 1}: ${tweetId.slice(0, 40)}...`);

      const steps = getRandom(2, 5);
      for (let j = 0; j < steps; j++) {
        const x = getRandom(box.x + 10, box.x + box.width - 10);
        const y = getRandom(box.y + 10, box.y + box.height - 10);
        await page.mouse.move(x, y, { steps: getRandom(10, 20) });
        await delay(getRandom(80, 180));
      }

      const isInteresting = Math.random() < interestChance;
      if (isInteresting) {
        logger.info("🌟 Интересный пост. Долгая задержка...");
        await delay(getRandom(stayMin, stayMax));
      } else {
        await delay(getRandom(minDelay, maxDelay));
      }

      viewedCount++;
      savedObjects[saveTo] = {
        lastViewedId: tweetId,
        count: viewedCount
      };

      logger.info(`💾 Прогресс сохранён: просмотрено ${viewedCount}, last ID: ${tweetId.slice(0, 30)}...`);
    }

    if (viewedCount < maxToView) {
      logger.info("🔽 Скроллим вниз для подгрузки новых твитов...");
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await delay(getRandom(1200, 2000));
    }
  }

  logger.info(`✅ Завершено. Просмотрено новых твитов: ${viewedCount}`);
  return savedObjects[saveTo];
}

// Function exports
module.exports.scrollAndViewTweets = scrollAndViewTweets;