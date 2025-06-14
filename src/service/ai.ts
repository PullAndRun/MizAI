import config from "@miz/ai/config/config.toml";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";
// import { GoogleGenAI, mcpToTool, type Content } from "@google/genai";
// import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
// import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const deepseek = new OpenAI({
  apiKey: config.deepseek.key,
  baseURL: config.deepseek.url,
});

// const gemini = new GoogleGenAI({
//   apiKey: config.gemini.key,
//   httpOptions: {
//     baseUrl: config.gemini.url,
//   },
// });

async function deepSeekChat(msg: ChatCompletionMessageParam[]) {
  return deepseek.chat.completions
    .create({
      messages: msg,
      ...config.ai.chat,
    })
    .then((chatCompletion) => chatCompletion.choices[0]?.message.content)
    .catch((_) => undefined);
}

// const playwrightMCP = new StdioClientTransport({
//   command: "npx",
//   args: ["@playwright/mcp@latest"],
// });

// async function geminiChat(contents: Array<Content>) {
//   const client = new Client({
//     name: "example-client",
//     version: "1.0.0",
//   });
//   await client.connect(playwrightMCP);
//   const response = await gemini.models.generateContent({
//     model: "gemini-2.0-flash",
//     contents: contents,
//     config: {
//       maxOutputTokens: 500,
//       temperature: 0.1,
//       tools: [mcpToTool(client)],
//     },
//   });
//   console.log(response.text);
//   return response.text;
// }

// geminiChat([
//   {
//     role: "user",
//     parts: [
//       {
//         text: JSON.stringify({
//           content:
//             "访问网页，概述网页的内容，用中文回复我https://www.bilibili.com/video/BV1yhERzxEvX/",
//         }),
//       },
//     ],
//   },
// ]);

export { deepSeekChat };
