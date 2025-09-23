import Config from "miz/config/config.toml";
import puppeteer from "puppeteer-core";

async function Browser() {
  return puppeteer
    .connect({
      browserWSEndpoint: Config.Puppeteer.browserWSEndpoint,
      acceptInsecureCerts: true,
      protocol: "cdp",
    })
    .catch((_) => undefined);
}

async function UrlToBase64(url: string, selector: string) {
  const browser = await Browser();
  if (!browser) return undefined;
  const page = await browser.newPage().catch((_) => undefined);
  if (!page) return undefined;
  await page.goto(url).catch((_) => undefined);
  const waitForSelector = await page
    .waitForSelector(selector)
    .catch((_) => undefined);
  if (!waitForSelector) return undefined;
  const b64 = await waitForSelector
    .screenshot({
      encoding: "binary",
    })
    .catch((_) => undefined);
  await page.close().catch((_) => undefined);
  if (!b64) return undefined;
  return Buffer.from(b64);
}

async function HtmlToBase64(html: string) {
  const browser = await Browser();
  if (!browser) return undefined;
  const page = await browser.newPage().catch((_) => undefined);
  if (!page) return undefined;
  await page.setContent(html).catch((_) => undefined);
  const b64 = await page
    .screenshot({
      encoding: "binary",
    })
    .catch((_) => undefined);
  await page.close().catch((_) => undefined);
  if (!b64) return undefined;
  return Buffer.from(b64);
}

export { HtmlToBase64, UrlToBase64 };
