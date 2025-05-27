import puppeteer, { Browser } from "puppeteer";
const browsers: Browser[] = [];

function getBrowser() {
  const browser = browsers[0];
  if (!browser) {
    throw new Error("没有开启的浏览器");
  }
  return browser;
}

async function openBrowser() {
  const browser = await puppeteer.launch();
  browsers.push(browser);
}

async function init() {
  await openBrowser();
}

export { init, getBrowser };
