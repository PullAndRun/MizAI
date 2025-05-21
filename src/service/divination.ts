import { deepSeekChat } from "./ai";

function divination() {
  const fortunes = ["大吉", "中吉", "小吉", "小凶", "凶", "大凶"];
  return fortunes[Math.floor(Math.random() * fortunes.length)];
}

function aiDivination(text: string) {
  return deepSeekChat([
    {
      role: "user",
      content: `帮我占卜 ${text}，结果可能是 "大吉"、"中吉"、"小吉"、"小凶"、"凶"、"大凶"`,
    },
  ]);
}

export { divination, aiDivination };
