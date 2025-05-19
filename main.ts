import { init as bot } from "@miz/ai/src/core/bot.ts";
import { init as db } from "@miz/ai/src/core/db.ts";

async function init() {
  await db();
  await bot();
}

init();
