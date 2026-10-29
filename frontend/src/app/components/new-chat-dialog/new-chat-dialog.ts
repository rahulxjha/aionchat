import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatStore } from '../../core/services/chat-store.service';
import { displayName } from '../../core/utils/names';
import { lastSeenLabel } from '../../core/utils/time';
import { Avatar } from '../avatar/avatar';

type Tab = 'direct' | 'group';

@Component({
  selector: 'app-new-chat-dialog',
  imports: [FormsModule, Avatar],
  templateUrl: './new-chat-dialog.html',
  styleUrl: './new-chat-dialog.scss',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class NewChatDialog {
  readonly closed = output<void>();
  protected readonly store = inject(ChatStore);

  protected readonly displayName = displayName;
  protected readonly lastSeenLabel = lastSeenLabel;

  protected readonly tab = signal<Tab>('direct');
  protected readonly query = signal('');
  protected readonly groupName = signal('');
  /** Selected usernames, in the order they were picked. */
  protected readonly selected = signal<string[]>([]);
  protected readonly busy = signal(false);

  protected readonly people = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.store
      .people()
      .filter(
        (user) =>
          !query ||
          user.username.toLowerCase().includes(query) ||
          displayName(user).toLowerCase().includes(query),
      );
  });

  protected readonly selectedUsers = computed(() =>
    this.selected()
      .map((username) => this.store.userByName(username))
      .filter((user) => user !== null),
  );

  protected readonly canCreateGroup = computed(
    () => this.groupName().trim().length > 0 && this.selected().length > 0 && !this.busy(),
  );

  protected isSelected(username: string): boolean {
    return this.selected().includes(username);
  }

  protected toggle(username: string): void {
    this.selected.update((list) =>
      list.includes(username) ? list.filter((u) => u !== username) : [...list, username],
    );
  }

  protected async startDirect(username: string): Promise<void> {
    this.busy.set(true);
    const ok = await this.store.openDirect(username);
    this.busy.set(false);
    if (ok) this.closed.emit();
  }

  protected async createGroup(): Promise<void> {
    if (!this.canCreateGroup()) return;
    this.busy.set(true);
    const ok = await this.store.createGroup(this.groupName().trim(), this.selected());
    this.busy.set(false);
    if (ok) this.closed.emit();
  }
}
