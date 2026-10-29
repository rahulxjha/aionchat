import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ConversationHeader } from '../../components/conversation-header/conversation-header';
import { MessageInput } from '../../components/message-input/message-input';
import { MessageList } from '../../components/message-list/message-list';
import { NewChatDialog } from '../../components/new-chat-dialog/new-chat-dialog';
import { Sidebar } from '../../components/sidebar/sidebar';
import { ChatStore } from '../../core/services/chat-store.service';

/** Page layout: sidebar on the left, open conversation on the right. Starts and stops the store. */
@Component({
  selector: 'app-chat',
  imports: [Sidebar, ConversationHeader, MessageList, MessageInput, NewChatDialog],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat implements OnInit, OnDestroy {
  protected readonly store = inject(ChatStore);
  protected readonly showNewChat = signal(false);

  ngOnInit(): void {
    void this.store.start();
  }

  ngOnDestroy(): void {
    this.store.stop();
  }
}
