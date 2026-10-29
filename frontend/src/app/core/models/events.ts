/** Payloads received on WebSocket topics (besides Message, Room and User). */

export interface TypingEvent {
  username: string;
  typing: boolean;
}

export interface ReadEvent {
  username: string;
  messageId: number;
}

export interface ServerError {
  message: string;
}
