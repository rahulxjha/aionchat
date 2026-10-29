export type MessageType = 'CHAT' | 'JOIN' | 'SYSTEM';

export interface Message {
  id: number;
  roomId: number;
  /** Null for system messages. */
  senderUsername: string | null;
  senderDisplayName: string | null;
  content: string;
  type: MessageType;
  sentAt: string;
}
