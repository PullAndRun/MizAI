import Config from "@miz/ai/config/config.toml";

function ToJson(text: string) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return undefined;
  }
}

function AIReply(message: string) {
  return (
    message
      //移除think标签
      .replace(/[\S\s]*?<\/think>/g, "")
      //移除开头的换行
      .replace(/^(\n+)/g, "")
      //合并多个换行为单个
      .replace(/\n+/g, "\n")
      //移除*两侧空格
      .replace(/ *\* */g, "*")
      //多个*变" * "
      .replace(/\*+/g, " * ")
      //移除#两侧空格
      .replace(/ *\# */g, "#")
      //多个#变"#"
      .replace(/\#+/g, "#")
      //#*变*
      .replace(/#\*/g, "*")
      //去除首尾空白
      .trim()
  );
}

function DeepseekPartText(text: string) {
  return text
    .trim()
    .replace(new RegExp(`(^\\s*${Config.Bot.name}\\s*)`, "g"), "");
}

export { AIReply, DeepseekPartText, ToJson };
