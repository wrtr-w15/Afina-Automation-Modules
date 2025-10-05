
const puppeteer = require('puppeteer-core');

// Built-in function replacePlaceholders
const replacePlaceholders = (value, savedObjects, defaultIndex = null) => {
  if (!value) return null;

  let hasError = false;

  const result = value.replace(
    /\$\{(.*?)(\[(\d+)?\])?(\.(.*?))?\}/g,
    (_, variable, __, index, ___, key) => {
      const actualIndex = index ? parseInt(index, 10) : defaultIndex;
      const objValue = savedObjects[variable];

      if (objValue === undefined) {
        console.warn(`Variable "${variable}" is not defined in savedObjects.`);
        hasError = true;
        return "";
      }

      if (Array.isArray(objValue)) {
        if (actualIndex !== null) {
          const objAtIdx = objValue[actualIndex];
          if (!objAtIdx) {
            console.warn(
              `Object at index ${actualIndex} for variable "${variable}" does not exist.`
            );
            hasError = true;
            return "";
          }
          if (key) {
            if (objAtIdx[key] !== undefined) {
              return objAtIdx[key];
            } else {
              console.warn(
                `Property "${key}" not found in object at index ${actualIndex}.`
              );
              hasError = true;
              return "";
            }
          } else {
            return JSON.stringify(objAtIdx || {});
          }
        } else {
          console.warn(
            `Index is required for array variable "${variable}" but not provided.`
          );
          hasError = true;
          return "";
        }
      }

      if (typeof objValue === "object" && objValue !== null) {
        if (key) {
          if (objValue[key] !== undefined) {
            return objValue[key];
          } else {
            console.warn(
              `Property "${key}" not found in object "${variable}".`
            );
            hasError = true;
            return "";
          }
        } else {
          return JSON.stringify(objValue);
        }
      }

      if (typeof objValue === "string") {
        if (actualIndex !== null) {
          return objValue[actualIndex] || "";
        } else {
          return objValue || "";
        }
      } else if (typeof objValue === "number") {
        if (actualIndex !== null) {
          return objValue[actualIndex] || "";
        } else {
          return objValue || "";
        }
      }

      console.warn(`Variable "${variable}" is of unsupported type.`);
      hasError = true;
      return "";
    }
  );

  return hasError && !result ? null : result;
};

// Built-in function delay
const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Connect to the browser through WebSocket
const connectToBrowser = async (wsEndpoint) => {
  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null
    });
    return browser;
  } catch (error) {
    console.error('Error connecting to the browser:', error);
    throw error;
  }
};

// Получение текущей активной страницы (исключая расширения)
const getCurrentPage = async (browser) => {
  try {
    // Получаем все страницы
    const pages = await browser.pages();
    
    if (pages.length === 0) {
      throw new Error('No available pages in the browser');
    }
    
    // Filter pages, excluding extensions and service pages
    const regularPages = pages.filter(page => {
      try {
        if (page.isClosed()) return false;
        const url = page.url();
        // Исключаем расширения, chrome-extension, moz-extension, about:, chrome://
        return !url.includes('chrome-extension://') && 
               !url.includes('moz-extension://') && 
               !url.includes('about:') && 
               !url.includes('chrome://') &&
               !url.includes('edge://') &&
               !url.includes('offscreen.html');
      } catch (e) {
        return false;
      }
    });
    
    if (regularPages.length === 0) {
      // If there are no regular pages, return the first available
      const firstAvailable = pages.find(page => !page.isClosed());
      return firstAvailable || pages[0];
    }
    
    // Search for an active page among regular pages
    for (const page of regularPages) {
      try {
        // Check that the page is visible (not in the background)
        const isVisible = await page.evaluate(() => !document.hidden);
        if (isVisible) {
          return page;
        }
      } catch (e) {
        // If the page is not available, continue searching
        continue;
      }
    }
    
    // If an active page is not found, return the first regular page
    return regularPages[0];
  } catch (error) {
    console.error('Error getting page:', error);
    throw error;
  }
};

module.exports = { replacePlaceholders, delay, connectToBrowser, getCurrentPage };
    