import { Component, computed, inject, input } from '@angular/core';
import { Room } from '../../core/models/room';
import { ChatStore } from '../../core/services/chat-store.service';
import { ConnectionStatus } from '../../core/services/stomp.service';
import { lastSeenLabel } from '../../core/utils/time';
import { Avatar } from '../avatar/avatar';

const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
};

@Component({
  selector: 'app-conversation-header',
  imports: [Avatar],
  templateUrl: './conversation-header.html',
  styleUrl: './conversation-header.scss',
})
export class ConversationHeader {
  readonly room = input.required<Room>();
  protected readonly store = inject(ChatStore);

  protected readonly title = computed(() => this.store.roomTitle(this.room()));
  protected readonly otherUser = computed(() =>
    this.room().type === 'DIRECT' ? this.store.otherUser(this.room()) : null,
  );

  /** "4 members · 3 online" for groups, "Online" / "Last seen 2h ago" for direct chats. */
  protected readonly subtitle = computed(() => {
    const room = this.room();
    if (room.type === 'DIRECT') return lastSeenLabel(this.otherUser());

    const online = room.members.filter(
      (m) => m.username === this.store.myUsername() || this.store.userByName(m.username)?.online,
    ).length;
    return `${room.members.length} members · ${online} online`;
  });

  protected readonly connectionLabel = computed(() => CONNECTION_LABELS[this.store.connection()]);
}
