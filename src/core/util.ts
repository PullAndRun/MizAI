import Config from "@miz/ai/config/config.toml";
import * as AIModel from "@miz/ai/src/models/ai";
import * as GroupModel from "@miz/ai/src/models/group";

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
      //移除thinking标签
      .replace(/[\S\s]*?<\/thinking>/g, "")
      //移除think标签
      .replace(/[\S\s]*?<\/metadata>/g, "")
      //去除music标签
      .replace(/<music[^>]*\/>/g, "")
      //移除开头的换行
      .replace(/^(\n+)/g, "")
      //超过3个换行符，变成2个
      .replace(/\n{3,}/g, "\n\n")
      //移除*两侧空格
      .replace(/ *\* */g, "*")
      //多个*变" * "
      .replace(/\*+/g, " * ")
      //移除#两侧空格
      .replace(/ *\# */g, "#")
      //多个#变"#"
      .replace(/\#+/g, "#")
      //#*变*
      .replace(/ *#\*/g, "## *")
      //\n\n * \n\n变\n\n
      .replace(/\n\n +\* +\n\n/g, "\n\n")
      //去除首尾空白
      .trim()
  );
}

function AIPartText(text: string) {
  return text
    .trim()
    .replace(new RegExp(`(^\\s*${Config.Bot.name}\\s*)`, "g"), "");
}

async function GroupPrompt(groupID: number) {
  const group = await GroupModel.FindOrAdd(groupID);
  if (!group) return undefined;
  const ai = await AIModel.Find(group.prompt_name);
  if (!ai) {
    const defaultPrompt = await AIModel.Find("默认");
    if (!defaultPrompt) return undefined;
    await GroupModel.Update(groupID, { prompt_name: "默认" });
    return defaultPrompt.prompt;
  }
  if (group.prompt_name === "默认") return ai.prompt;
  const promptModel = await AIModel.Find("自定义范本");
  if (!promptModel) return undefined;
  return promptModel.prompt.replaceAll("***替换文本***", ai.prompt);
}

export { AIPartText, AIReply, GroupPrompt, ToJson };
