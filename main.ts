import { Init as Bot } from "@miz/ai/src/core/bot";
import { Init as Database } from "@miz/ai/src/core/db";
import { Init as Plugin } from "@miz/ai/src/core/plugin";
import { Init as Timer } from "@miz/ai/src/core/timer";

async function init() {
  await Database();
  await Bot();
  await Plugin();
  await Timer();
}

init();
