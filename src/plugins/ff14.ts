import config from "@miz/ai/config/config.toml";
import { cmd, cmdText, sendGroupMsg } from "@miz/ai/src/core/bot";
import { searchBoard } from "@miz/ai/src/service/ff14";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "ff14",
  comment: [
    `使用 "ff14 板子 [猫|猪|狗|鸟] [商品名]" 命令进行最终幻想14交易板商品查询`,
  ],
  plugin,
};

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name, info.name]);
  const cmdList: commandList = [
    {
      cmd: "板子",
      cmt: `使用 "ff14 板子 [猫|猪|狗|鸟] [商品名]" 命令进行最终幻想14交易板商品查询`,
      role: "member",
      plugin: board,
    },
  ];
  await cmd(msg, event, cmdList);
}

async function board(msg: string, event: GroupMessage) {
  const [region, goods] = msg.split(" ");
  if (!region || !goods) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `命令错误。请使用 "ff14 板子 [猫|猪|狗|鸟] [商品名]" 命令进行最终幻想14交易板商品查询。`
      ),
    ]);
    return;
  }
  const result = await searchBoard(region, goods);
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(result),
  ]);
}

export { info };
