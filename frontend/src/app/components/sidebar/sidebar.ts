import { Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { Room } from '../../core/models/room';
import { ChatStore } from '../../core/services/chat-store.service';
import { SessionService } from '../../core/services/session.service';
import { displayName, firstName } from '../../core/utils/names';
import { formatListTime, lastSeenLabel } from '../../core/utils/time';
import { Avatar } from '../avatar/avatar';

@Component({
  selector: 'app-sidebar',
  imports: [Avatar],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly newChat = output<void>();

  protected readonly store = inject(ChatStore);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly me = this.session.currentUser;
  protected readonly displayName = displayName;
  protected readonly formatListTime = formatListTime;
  protected readonly lastSeenLabel = lastSeenLabel;

  /** "You: …" for my messages, "Neha: …" in groups, plain text in direct chats. */
  protected preview(room: Room): string {
    const message = room.lastMessage;
    if (!message) return 'No messages yet';
    if (message.type !== 'CHAT' || !message.senderUsername) return message.content;
    if (message.senderUsername === this.store.myUsername()) return `You: ${message.content}`;
    if (room.type === 'GROUP') {
      return `${firstName(this.store.displayNameOf(message.senderUsername))}: ${message.content}`;
    }
    return message.content;
  }

  protected isOtherOnline(room: Room): boolean {
    return room.type === 'DIRECT' && !!this.store.otherUser(room)?.online;
  }

  protected onSearch(event: Event): void {
    this.store.search.set((event.target as HTMLInputElement).value);
  }

  protected logout(): void {
    this.store.stop();
    this.session.logout();
    void this.router.navigate(['/login']);
  }
}
