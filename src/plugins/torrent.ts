import Config from "@miz/ai/config/config.toml";
import { Client, CommandText, SendGroupMessage } from "@miz/ai/src/core/bot";
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
    if (!Verify(torrent.name)) continue;
    nodeSegment.push(
      Structs.customNode([
        Structs.text(
          `📝 标题: ${Filter(torrent.name).text}\n📦 大小: ${(
            torrent.size /
            1024 /
            1024
          ).toFixed(2)} MB\n🧲 磁链: ${torrent.magnetUri.replace(/&dn.*/g, "")}`
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
  nodeSegment.unshift(
    Structs.customNode([
      Structs.text(
        `本消息${Config.Bitmagnet.timeout}秒后自动撤回，请手动保存搜索结果。`
      ),
    ])
  );
  const message = await SendGroupMessage(event.group_id, nodeSegment);
  if (!message) return;
  setTimeout(async () => {
    await Client().delete_msg({ message_id: message.message_id });
  }, Config.Bitmagnet.timeout * 1000);
}

export { info };
