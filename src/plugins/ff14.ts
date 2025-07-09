import Config from "@miz/ai/config/config.toml";
import { CommandText, Invoke, SendGroupMessage } from "@miz/ai/src/core/bot";
import { TradingBoard } from "@miz/ai/src/service/ff14";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "ff14",
  comment: [
    `使用 "ff14 板子 [猫|猪|狗|鸟] [商品名]" 命令进行最终幻想14交易板商品查询`,
  ],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const commandText = CommandText(event.raw_message, [
    Config.Bot.name,
    info.name,
  ]);
  const invokeParameterList: InvokeParameterList = [
    {
      command: "板子",
      comment: `使用 "ff14 板子 [猫|猪|狗|鸟] [商品名]" 命令进行最终幻想14交易板商品查询`,
      role: "member",
      plugin: Board,
    },
  ];
  await Invoke(event, commandText, invokeParameterList);
}

async function Board(message: string, event: GroupMessage) {
  const [region, goods] = message.split(" ");
  if (!region || !goods) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `命令错误。请使用 "ff14 板子 [猫|猪|狗|鸟] [商品名]" 命令进行最终幻想14交易板商品查询。`
      ),
    ]);
    return;
  }
  const tradingBoard = await TradingBoard(region, goods);
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(tradingBoard),
  ]);
}

export { info };
