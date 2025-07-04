import type { GroupMessage } from "node-napcat-ts";

declare global {
  type GroupRole = "member" | "admin" | "owner" | "system";
  declare type InvokeParameterList = Array<{
    command: string;
    comment: string;
    role: groupRole;
    plugin: (message: string, event: GroupMessage) => Promise<void>;
  }>;
}
