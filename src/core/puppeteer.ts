import puppeteer from "puppeteer-core";
import Config from "@miz/ai/config/config.toml";

async function UrlToBase64(url: string, selector: string) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: Config.Puppeteer.browserWSEndpoint,
    protocol: "cdp",
  });
  const page = await browser.newPage();
  await page.goto(url);
  const waitForSelector = await page.waitForSelector(selector);
  if (!waitForSelector) return undefined;
  const b64 = await waitForSelector.screenshot({
    encoding: "base64",
  });
  await browser.close();
  return `data:image/png;base64,${b64}`;
}

async function HtmlToBase64(html: string) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: Config.Puppeteer.browserWSEndpoint,
    protocol: "cdp",
  });
  const page = await browser.newPage();
  await page.setContent(html);
  const b64 = await page.screenshot({
    fullPage: true,
    encoding: "base64",
  });
  await browser.close();
  return `data:image/png;base64,${b64}`;
}

export { UrlToBase64, HtmlToBase64 };
