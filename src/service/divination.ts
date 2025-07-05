function Divination() {
  const fortunes = ["大吉", "中吉", "小吉", "小凶", "凶", "大凶"];
  return fortunes[Math.floor(Math.random() * fortunes.length)];
}

export { Divination };
