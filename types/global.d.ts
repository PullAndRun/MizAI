import type { GroupMessage } from "node-napcat-ts";

declare global {
  type groupRole = "member" | "admin" | "owner" | "system";
  declare type commandList = Array<{
    cmd: string;
    cmt: string;
    role: groupRole;
    plugin: (msg: string, event: GroupMessage) => Promise<void>;
  }>;
}
