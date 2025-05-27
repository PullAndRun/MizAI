import { init as bot } from "@miz/ai/src/core/bot";
import { init as db } from "@miz/ai/src/core/db";
import { init as plugin } from "@miz/ai/src/core/plugin";
import { init as timer } from "@miz/ai/src/core/timer";
import { init as browser } from "@miz/ai/src/core/puppeteer";

async function init() {
  await db();
  await browser();
  await bot();
  await plugin();
  await timer();
}

init();
