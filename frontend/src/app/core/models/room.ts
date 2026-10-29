import { Message } from './message';

export type RoomType = 'DIRECT' | 'GROUP';

export interface RoomMember {
  username: string;
  displayName: string | null;
  /** Last message this member has seen - drives unread counts and read ticks. */
  lastReadMessageId: number | null;
}

export interface Room {
  id: number;
  type: RoomType;
  /** Group name. Null for direct messages - the title is the other member's name. */
  name: string | null;
  members: RoomMember[];
  lastMessage: Message | null;
  unreadCount: number;
  createdAt: string;
}
