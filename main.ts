import { init as bot } from "@miz/ai/src/core/bot.ts";
import { init as db } from "@miz/ai/src/core/db.ts";
import { init as plugin } from "@miz/ai/src/core/plugin.ts";
import { init as timer } from "@miz/ai/src/core/timer.ts";

async function init() {
  await db();
  await bot();
  await plugin();
  await timer();
}

init();
