import { Component, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Room } from '../../core/models/room';
import { ChatStore } from '../../core/services/chat-store.service';

const MAX_LENGTH = 1000;
/** Send "typing" at most this often while keys are being pressed. */
const TYPING_THROTTLE_MS = 2000;
/** Send "stopped typing" after this long without a key press. */
const TYPING_IDLE_MS = 3000;

@Component({
  selector: 'app-message-input',
  templateUrl: './message-input.html',
  styleUrl: './message-input.scss',
})
export class MessageInput implements OnDestroy {
  readonly room = input.required<Room>();
  protected readonly store = inject(ChatStore);

  protected readonly maxLength = MAX_LENGTH;
  protected readonly text = signal('');
  protected readonly placeholder = computed(() => `Message ${this.store.roomTitle(this.room())}`);
  protected readonly canSend = computed(
    () => this.text().trim().length > 0 && this.store.connection() === 'connected',
  );

  private typingRoomId: number | null = null;
  private lastTypingSentAt = 0;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Switching chats: stop "typing" in the old one and start with an empty box.
    effect(() => {
      this.room().id;
      untracked(() => {
        this.stopTyping();
        this.text.set('');
      });
    });
  }

  ngOnDestroy(): void {
    this.stopTyping();
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.text.set(value);
    if (!value.trim()) {
      this.stopTyping();
      return;
    }

    const now = Date.now();
    if (now - this.lastTypingSentAt > TYPING_THROTTLE_MS) {
      this.store.sendTyping(this.room().id, true);
      this.typingRoomId = this.room().id;
      this.lastTypingSentAt = now;
    }
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.stopTyping(), TYPING_IDLE_MS);
  }

  protected send(event: Event): void {
    event.preventDefault();
    if (!this.canSend()) return;
    this.store.send(this.room().id, this.text().trim());
    this.text.set('');
    this.stopTyping();
  }

  private stopTyping(): void {
    clearTimeout(this.idleTimer);
    if (this.typingRoomId !== null) {
      this.store.sendTyping(this.typingRoomId, false);
      this.typingRoomId = null;
    }
    this.lastTypingSentAt = 0;
  }
}
