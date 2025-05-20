type groupMessageEvent = {
  senderId: number;
  groupId: number;
  messageId: number;
};
type groupRole = "member" | "admin" | "owner" | "system";
type commandList = Array<{
  cmd: string;
  cmt: string;
  role: groupRole;
  plugin: (msg: string, event: groupMessageEvent) => Promise<void>;
}>;
