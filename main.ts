import { Init as Bot } from "miz/src/core/bot";
import { Init as Database } from "miz/src/core/db";
import { Init as Plugin } from "miz/src/core/plugin";
import { Init as Timer } from "miz/src/core/timer";
import { Init as Sensitive } from "miz/src/service/sensitive";
import { sleep } from "bun";

async function init() {
  await sleep(10 * 1000);
  await Database();
  await Sensitive();
  await Bot();
  await Plugin();
  await Timer();
}

init();
