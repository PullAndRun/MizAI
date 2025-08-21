import { Mint } from "mint-filter";

const sensitiveWords: Array<string> = [];
async function Init() {
  const file = Bun.file("resource/keywords.txt");
  const text = await file.text();
  for (const words of text.split("\n")) {
    sensitiveWords.push(words.replace("\r", ""));
  }
}

function Filter(keywords: string) {
  const mint = new Mint(sensitiveWords);
  return mint.filter(keywords);
}

function Verify(keywords: string) {
  const mint = new Mint(sensitiveWords);
  return mint.verify(keywords);
}

export { Filter, Init, Verify };
