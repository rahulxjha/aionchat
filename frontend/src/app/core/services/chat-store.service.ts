import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ReadEvent, ServerError, TypingEvent } from '../models/events';
import { Message } from '../models/message';
import { Room } from '../models/room';
import { User } from '../models/user';
import { displayName, firstName } from '../utils/names';
import { ApiService, apiErrorMessage } from './api.service';
import { SessionService } from './session.service';
import { StompService } from './stomp.service';

const PAGE_SIZE = 30;
const TYPING_TIMEOUT_MS = 4000;

/**
 * Single source of truth for the chat workspace.
 * Initial data comes from REST, live updates come from WebSocket topics,
 * and everything is exposed as signals that components read.
 */
@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly api = inject(ApiService);
  private readonly stomp = inject(StompService);
  private readonly session = inject(SessionService);

  // ---- State ----
  readonly users = signal<User[]>([]);
  readonly rooms = signal<Room[]>([]);
  /** History per room id. A room only has a key once its history was loaded. */
  readonly messages = signal<Record<number, Message[]>>({});
  readonly hasMore = signal<Record<number, boolean>>({});
  /** Usernames typing per room id (never includes me). */
  readonly typing = signal<Record<number, string[]>>({});
  readonly activeRoomId = signal<number | null>(null);
  readonly search = signal('');
  readonly error = signal<string | null>(null);
  readonly connection = this.stomp.status;

  // ---- Derived state ----
  readonly myUsername = computed(() => this.session.currentUser()?.username ?? '');
  private readonly usersByName = computed(
    () => new Map(this.users().map((user) => [user.username, user])),
  );

  readonly activeRoom = computed(
    () => this.rooms().find((room) => room.id === this.activeRoomId()) ?? null,
  );

  /** Everyone except me, online first, then alphabetical. */
  readonly people = computed(() =>
    this.users()
      .filter((user) => user.username !== this.myUsername())
      .sort(
        (a, b) =>
          Number(b.online) - Number(a.online) || displayName(a).localeCompare(displayName(b)),
      ),
  );
  readonly onlineCount = computed(() => this.people().filter((user) => user.online).length);

  /** Most recent activity first, filtered by the sidebar search. */
  readonly filteredRooms = computed(() => {
    const query = this.search().trim().toLowerCase();
    return [...this.rooms()]
      .sort((a, b) => lastActivity(b) - lastActivity(a))
      .filter((room) => !query || this.roomTitle(room).toLowerCase().includes(query));
  });

  readonly filteredPeople = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.people().filter(
      (user) =>
        !query ||
        user.username.toLowerCase().includes(query) ||
        displayName(user).toLowerCase().includes(query),
    );
  });

  private readonly subscribedRooms = new Set<number>();
  private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** True when we may have missed events (after a disconnect or a failed load). */
  private needsResync = false;

  constructor() {
    // Coming back to the tab counts as reading the open chat.
    document.addEventListener('visibilitychange', () => {
      const roomId = this.activeRoomId();
      if (!document.hidden && roomId !== null) this.markRead(roomId);
    });
  }

  // ---- Lifecycle ----

  async start(): Promise<void> {
    const username = this.myUsername();
    if (!username) return;
    this.requestNotificationPermission();

    try {
      await this.loadInitialData();
      this.needsResync = false;
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not reach the server. Retrying…'));
      this.needsResync = true;
    }

    // The user may have logged out while we were loading.
    if (this.myUsername() !== username) return;
    this.stomp.connect(username, () => this.onConnected());
  }

  stop(): void {
    this.stomp.disconnect();
    this.typingTimers.forEach((timer) => clearTimeout(timer));
    this.typingTimers.clear();
    this.subscribedRooms.clear();
    this.needsResync = false;
    this.users.set([]);
    this.rooms.set([]);
    this.messages.set({});
    this.hasMore.set({});
    this.typing.set({});
    this.activeRoomId.set(null);
    this.search.set('');
    this.error.set(null);
  }

  private async loadInitialData(): Promise<void> {
    const me = this.session.currentUser();
    if (!me) return;
    // Re-join first: guarantees the user exists (e.g. after a DB reset) and refreshes the profile.
    this.session.login(await firstValueFrom(this.api.join(me.username, null)));

    const [users, rooms] = await firstValueFrom(
      forkJoin([this.api.getUsers(), this.api.getMyRooms()]),
    );
    this.users.set(users);
    this.rooms.set(rooms);
  }

  /** Runs on the first connect and on every reconnect - old subscriptions are gone by then. */
  private onConnected(): void {
    this.subscribedRooms.clear();
    this.typing.set({});

    this.stomp.subscribe<User>('/topic/presence', (user) => this.upsertUser(user));
    this.stomp.subscribe<Room>('/user/queue/rooms', (room) => this.addRoom(room));
    this.stomp.subscribe<ServerError>('/user/queue/errors', (e) => this.error.set(e.message));
    this.rooms().forEach((room) => this.subscribeRoom(room.id));

    if (this.needsResync) void this.resync();
    this.needsResync = true;
  }

  /** After a reconnect: reload rooms and users, then fetch messages we missed. */
  private async resync(): Promise<void> {
    try {
      await this.loadInitialData();
      this.rooms().forEach((room) => this.subscribeRoom(room.id));

      for (const [key, list] of Object.entries(this.messages())) {
        const roomId = Number(key);
        const missed = await firstValueFrom(
          this.api.getMessages(roomId, { after: list.at(-1)?.id, size: 100 }),
        );
        this.mergeMessages(roomId, missed);
      }

      const activeRoomId = this.activeRoomId();
      if (activeRoomId !== null) this.markRead(activeRoomId);
      this.error.set(null);
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not refresh chats after reconnecting.'));
    }
  }

  private subscribeRoom(roomId: number): void {
    if (this.subscribedRooms.has(roomId) || this.connection() !== 'connected') return;
    this.subscribedRooms.add(roomId);

    this.stomp.subscribe<Message>(`/topic/rooms/${roomId}`, (m) => this.onMessage(m));
    this.stomp.subscribe<TypingEvent>(`/topic/rooms/${roomId}/typing`, (e) =>
      this.onTyping(roomId, e),
    );
    this.stomp.subscribe<ReadEvent>(`/topic/rooms/${roomId}/read`, (e) => this.onRead(roomId, e));
  }

  // ---- Actions (called by components) ----

  async selectRoom(roomId: number): Promise<void> {
    this.activeRoomId.set(roomId);
    if (!(roomId in this.messages())) await this.loadHistory(roomId);
    this.markRead(roomId);
  }

  async loadOlder(): Promise<void> {
    const roomId = this.activeRoomId();
    const oldest = roomId === null ? undefined : this.messages()[roomId]?.[0];
    if (roomId === null || !oldest) return;

    try {
      const page = await firstValueFrom(
        this.api.getMessages(roomId, { before: oldest.id, size: PAGE_SIZE }),
      );
      this.mergeMessages(roomId, page);
      this.hasMore.update((all) => ({ ...all, [roomId]: page.length === PAGE_SIZE }));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not load older messages.'));
    }
  }

  /** The server assigns id and time, then broadcasts it back - that echo is what we display. */
  send(roomId: number, content: string): void {
    if (!this.stomp.publish(`/app/rooms/${roomId}/send`, { content })) {
      this.error.set('You are offline - the message was not sent.');
    }
  }

  sendTyping(roomId: number, typing: boolean): void {
    this.stomp.publish(`/app/rooms/${roomId}/typing`, { typing });
  }

  async openDirect(username: string): Promise<boolean> {
    const existing = this.rooms().find(
      (room) => room.type === 'DIRECT' && room.members.some((m) => m.username === username),
    );
    if (existing) {
      await this.selectRoom(existing.id);
      return true;
    }

    try {
      const room = await firstValueFrom(this.api.openDirectRoom(username));
      this.addRoom(room);
      await this.selectRoom(room.id);
      return true;
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not open the chat.'));
      return false;
    }
  }

  async createGroup(name: string, memberUsernames: string[]): Promise<boolean> {
    try {
      const room = await firstValueFrom(this.api.createGroup(name, memberUsernames));
      this.addRoom(room);
      await this.selectRoom(room.id);
      return true;
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not create the group.'));
      return false;
    }
  }

  // ---- Display helpers ----

  displayNameOf(username: string): string {
    const user = this.usersByName().get(username);
    return user ? displayName(user) : username;
  }

  userByName(username: string): User | null {
    return this.usersByName().get(username) ?? null;
  }

  /** For a direct room: the person on the other side. */
  otherUser(room: Room): User | null {
    const other = room.members.find((m) => m.username !== this.myUsername());
    return other ? this.userByName(other.username) : null;
  }

  roomTitle(room: Room): string {
    if (room.type === 'GROUP') return room.name ?? 'Group';
    const other = room.members.find((m) => m.username !== this.myUsername());
    return other ? this.displayNameOf(other.username) : 'Direct message';
  }

  /** Key for the avatar color: the person for direct rooms, the group name otherwise. */
  roomColorKey(room: Room): string {
    return room.type === 'DIRECT' ? (this.otherUser(room)?.username ?? '') : (room.name ?? '');
  }

  /** "typing…" (short, for the sidebar) or "Aman is typing…" / "Aman and Priya are typing…". */
  typingText(roomId: number, short = false): string {
    const usernames = this.typing()[roomId] ?? [];
    if (usernames.length === 0) return '';

    const room = this.rooms().find((r) => r.id === roomId);
    if (short && room?.type === 'DIRECT') return 'typing…';

    const names = usernames.map((u) => firstName(this.displayNameOf(u)));
    if (names.length === 1) return `${names[0]} is typing…`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
    return 'Several people are typing…';
  }

  /** Double tick: at least one other member has read up to this message. */
  isReadByOthers(message: Message): boolean {
    const room = this.rooms().find((r) => r.id === message.roomId);
    return !!room?.members.some(
      (m) => m.username !== this.myUsername() && (m.lastReadMessageId ?? 0) >= message.id,
    );
  }

  // ---- WebSocket event handlers ----

  private onMessage(message: Message): void {
    if (message.roomId in this.messages()) this.mergeMessages(message.roomId, [message]);
    if (message.senderUsername) this.setTyping(message.roomId, message.senderUsername, false);

    const mine = message.senderUsername === this.myUsername();
    const seenNow = message.roomId === this.activeRoomId() && !document.hidden;

    this.updateRoom(message.roomId, (room) => ({
      ...room,
      members: isNewMember(room, message)
        ? [
            ...room.members,
            {
              username: message.senderUsername!,
              displayName: message.senderDisplayName,
              lastReadMessageId: message.id,
            },
          ]
        : room.members,
      lastMessage: message,
      unreadCount: mine || seenNow ? room.unreadCount : room.unreadCount + 1,
    }));

    if (seenNow && !mine) this.markRead(message.roomId);
    if (!mine && document.hidden) this.notify(message);
  }

  private onTyping(roomId: number, event: TypingEvent): void {
    if (event.username === this.myUsername()) return;
    this.setTyping(roomId, event.username, event.typing);
  }

  private onRead(roomId: number, event: ReadEvent): void {
    this.updateRoom(roomId, (room) => ({
      ...room,
      members: room.members.map((m) =>
        m.username === event.username
          ? { ...m, lastReadMessageId: Math.max(m.lastReadMessageId ?? 0, event.messageId) }
          : m,
      ),
    }));
  }

  private upsertUser(user: User): void {
    this.users.update((users) =>
      users.some((u) => u.username === user.username)
        ? users.map((u) => (u.username === user.username ? user : u))
        : [...users, user],
    );
  }

  private addRoom(room: Room): void {
    if (!this.rooms().some((r) => r.id === room.id)) {
      this.rooms.update((rooms) => [...rooms, room]);
    }
    this.subscribeRoom(room.id);
  }

  // ---- Internals ----

  private async loadHistory(roomId: number): Promise<void> {
    try {
      const page = await firstValueFrom(this.api.getMessages(roomId, { size: PAGE_SIZE }));
      this.mergeMessages(roomId, page);
      this.hasMore.update((all) => ({ ...all, [roomId]: page.length === PAGE_SIZE }));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not load messages.'));
    }
  }

  /** Adds messages without duplicates (same id = same message) and keeps them in id order. */
  private mergeMessages(roomId: number, incoming: Message[]): void {
    this.messages.update((all) => {
      const byId = new Map((all[roomId] ?? []).map((m) => [m.id, m]));
      incoming.forEach((m) => byId.set(m.id, m));
      return { ...all, [roomId]: [...byId.values()].sort((a, b) => a.id - b.id) };
    });
  }

  /** Tells the server how far I have read; it updates unread counts and others' ticks. */
  private markRead(roomId: number): void {
    const room = this.rooms().find((r) => r.id === roomId);
    const lastId = this.messages()[roomId]?.at(-1)?.id ?? room?.lastMessage?.id;
    if (!room || !lastId) return;

    const me = room.members.find((m) => m.username === this.myUsername());
    if (room.unreadCount === 0 && (me?.lastReadMessageId ?? 0) >= lastId) return;

    this.stomp.publish(`/app/rooms/${roomId}/read`, { messageId: lastId });
    this.updateRoom(roomId, (r) => ({
      ...r,
      unreadCount: 0,
      members: r.members.map((m) =>
        m.username === this.myUsername() ? { ...m, lastReadMessageId: lastId } : m,
      ),
    }));
  }

  /** Typing expires on its own, so a crashed tab never leaves "typing…" stuck. */
  private setTyping(roomId: number, username: string, typing: boolean): void {
    const key = `${roomId}:${username}`;
    clearTimeout(this.typingTimers.get(key));
    this.typingTimers.delete(key);

    this.typing.update((all) => {
      const others = (all[roomId] ?? []).filter((u) => u !== username);
      return { ...all, [roomId]: typing ? [...others, username] : others };
    });

    if (typing) {
      this.typingTimers.set(
        key,
        setTimeout(() => this.setTyping(roomId, username, false), TYPING_TIMEOUT_MS),
      );
    }
  }

  private updateRoom(roomId: number, change: (room: Room) => Room): void {
    this.rooms.update((rooms) => rooms.map((room) => (room.id === roomId ? change(room) : room)));
  }

  private notify(message: Message): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const room = this.rooms().find((r) => r.id === message.roomId);
    const sender = message.senderUsername ? this.displayNameOf(message.senderUsername) : '';
    const body =
      room?.type === 'GROUP' && sender ? `${sender}: ${message.content}` : message.content;
    new Notification(room ? this.roomTitle(room) : 'New message', {
      body,
      tag: `room-${message.roomId}`,
    });
  }

  private requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }
}

function lastActivity(room: Room): number {
  return Date.parse(room.lastMessage?.sentAt ?? room.createdAt);
}

/** A JOIN message announces a member this client does not know about yet. */
function isNewMember(room: Room, message: Message): boolean {
  return (
    message.type === 'JOIN' &&
    !!message.senderUsername &&
    !room.members.some((m) => m.username === message.senderUsername)
  );
}
