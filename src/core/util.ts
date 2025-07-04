function ToJson(text: string) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return undefined;
  }
}

function AIMessage(message: string) {
  return (
    message
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
      //去除首位空白
      .trim()
  );
}

export { AIMessage, ToJson };
