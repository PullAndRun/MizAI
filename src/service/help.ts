import { plugins } from "@miz/ai/src/core/plugin";

function help() {
  return plugins
    .map((v, i) => `${i + 1}、${v.name}\n${v.comment.join("\n")}`)
    .join("\n\n");
}

export { help };
