import type { GroupMessage } from "node-napcat-ts";
import "node-napcat-ts";

declare global {
  type GroupRole = "member" | "admin" | "owner" | "system";
  declare type Menu = Array<{
    command: string;
    comment: string;
    role: groupRole;
    plugin: (message: string, event: GroupMessage) => Promise<void>;
  }>;
}

declare module "node-napcat-ts" {
  interface NCWebsocket {
    get_group_info(params: WSSendParam["get_group_info"]): Promise<{
      group_id: number;
      group_name: string;
      member_count: number;
      max_member_count: number;
      group_all_shut: number;
      group_remark: string;
    }>;
  }
}
