import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Message } from '../../core/models/message';
import { Room } from '../../core/models/room';
import { ChatStore } from '../../core/services/chat-store.service';
import { avatarColor } from '../../core/utils/avatar';
import { dayLabel, formatTime, sameDay } from '../../core/utils/time';
import { Avatar } from '../avatar/avatar';

/** A message plus how to draw it, worked out once per change instead of in the template. */
interface MessageRow {
  message: Message;
  mine: boolean;
  /** "Today" divider before the first message of each day. */
  dayLabel: string | null;
  /** Sender name above the first bubble of a run (groups only). */
  showName: boolean;
  /** Avatar next to the last bubble of a run. */
  showAvatar: boolean;
}

const NEAR_BOTTOM_PX = 120;

@Component({
  selector: 'app-message-list',
  imports: [Avatar],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
})
export class MessageList {
  readonly room = input.required<Room>();

  protected readonly store = inject(ChatStore);
  private readonly injector = inject(Injector);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  protected readonly formatTime = formatTime;
  protected readonly loadingOlder = signal(false);
  protected readonly loaded = computed(() => this.room().id in this.store.messages());
  protected readonly hasMore = computed(() => !!this.store.hasMore()[this.room().id]);
  protected readonly typingText = computed(() => this.store.typingText(this.room().id));

  protected readonly rows = computed<MessageRow[]>(() => {
    const messages = this.store.messages()[this.room().id] ?? [];
    const isGroup = this.room().type === 'GROUP';
    const me = this.store.myUsername();

    return messages.map((message, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const mine = message.senderUsername === me;
      return {
        message,
        mine,
        dayLabel: !prev || !sameDay(prev.sentAt, message.sentAt) ? dayLabel(message.sentAt) : null,
        showName: isGroup && !mine && !sameRun(prev, message),
        showAvatar: !mine && !sameRun(message, next),
      };
    });
  });

  private lastRoomId: number | null = null;
  private lastMessageId: number | null = null;

  constructor() {
    // Auto-scroll: when a chat opens, when I send, or when a new message arrives while I'm at the bottom.
    // Loading older messages changes only the top of the list, so it never triggers this.
    effect(() => {
      const roomId = this.room().id;
      const last = this.rows().at(-1);
      const lastId = last?.message.id ?? null;

      const roomChanged = roomId !== this.lastRoomId;
      const newAtBottom = lastId !== this.lastMessageId;
      this.lastRoomId = roomId;
      this.lastMessageId = lastId;

      if (roomChanged || (newAtBottom && (last?.mine || this.isNearBottom()))) {
        afterNextRender(() => this.scrollToBottom(), { injector: this.injector });
      }
    });
  }

  protected async loadOlder(): Promise<void> {
    const el = this.scroller()?.nativeElement;
    if (!el) return;

    // Keep the message the user was looking at in place while older ones are added above it.
    const heightBefore = el.scrollHeight;
    this.loadingOlder.set(true);
    await this.store.loadOlder();
    this.loadingOlder.set(false);
    afterNextRender(() => (el.scrollTop += el.scrollHeight - heightBefore), {
      injector: this.injector,
    });
  }

  protected senderName(message: Message): string {
    return message.senderUsername ? this.store.displayNameOf(message.senderUsername) : '';
  }

  protected senderColor(message: Message): string {
    return avatarColor(message.senderUsername ?? '').fg;
  }

  private isNearBottom(): boolean {
    const el = this.scroller()?.nativeElement;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }

  private scrollToBottom(): void {
    const el = this.scroller()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}

/** Two chat messages in a row from the same person on the same day are drawn as one group. */
function sameRun(a: Message | undefined, b: Message | undefined): boolean {
  return (
    !!a &&
    !!b &&
    a.type === 'CHAT' &&
    b.type === 'CHAT' &&
    a.senderUsername === b.senderUsername &&
    sameDay(a.sentAt, b.sentAt)
  );
}
