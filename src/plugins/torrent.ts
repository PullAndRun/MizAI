import Config from "@miz/ai/config/config.toml";
import { CommandText, SendGroupMessage } from "@miz/ai/src/core/bot";
import { Search } from "@miz/ai/src/service/torrent";
import { Structs, type GroupMessage, type NodeSegment } from "node-napcat-ts";
import { Filter, Verify } from "../service/sensitive";

const info = {
  name: "磁链",
  comment: [`使用 "磁链 [搜索内容]" 命令搜索磁力链接`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const commandText = CommandText(event.raw_message, [
    Config.Bot.name,
    info.name,
  ]);
  if (!commandText) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`搜索失败，缺少搜索内容。\n请${info.comment[0]}`),
    ]);
    return;
  }
  const search = await Search(commandText);
  if (!search) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`搜索失败，暂未收录您搜索的资源。`),
    ]);
    return;
  }
  const nodeSegment: NodeSegment[] = [];

  for (const { torrent } of search) {
    nodeSegment.push(
      Structs.customNode([
        Structs.text(
          `标题: ${Filter(torrent.name).text}\n大小: ${(
            torrent.size /
            1024 /
            1024
          ).toFixed(2)} MB\n磁链: ${torrent.magnetUri.replace(/&dn.*/g, "")}`
        ),
      ])
    );
  }
  if (nodeSegment.length === 0) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`搜索失败，暂未收录您搜索的资源。`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, nodeSegment);
}

export { info };
