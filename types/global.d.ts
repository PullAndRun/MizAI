type groupMessageEvent = {
  senderId: number;
  groupId: number;
  messageId: number;
};
type groupRole = "member" | "admin" | "owner" | "system";
