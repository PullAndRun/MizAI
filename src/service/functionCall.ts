import { Type } from "@google/genai";

function imageSearch() {
  return {
    name: "get_image",
    description: "使用搜索引擎根据图片名称搜索图片。",
    parameters: {
      type: Type.OBJECT,
      properties: {
        imageName: {
          type: Type.ARRAY,
          description: "供搜索的图片名称",
        },
      },
      required: ["imageName"],
    },
  };
}

function groupHistory() {
  return {
    name: "get_group_history",
    description: "需要获取群聊记录",
    parameters: {
      type: Type.OBJECT,
      properties: {
        imageName: {
          type: Type.ARRAY,
          description: "供搜索的图片名称",
        },
      },
      required: ["imageName"],
    },
  };
}

export {};
