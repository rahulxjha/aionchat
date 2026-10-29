import { Injectable, signal } from '@angular/core';
import { User } from '../models/user';

export interface RecentUser {
  username: string;
  displayName: string | null;
}

// sessionStorage is per tab, so two tabs can be two different users during a demo.
// Recent users are per device, so they live in localStorage.
const CURRENT_USER_KEY = 'aionchat.currentUser';
const RECENT_USERS_KEY = 'aionchat.recentUsers';
const MAX_RECENT_USERS = 5;

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly currentUser = signal<User | null>(read<User>(sessionStorage, CURRENT_USER_KEY));
  readonly recentUsers = signal<RecentUser[]>(read<RecentUser[]>(localStorage, RECENT_USERS_KEY) ?? []);

  login(user: User): void {
    this.currentUser.set(user);
    write(sessionStorage, CURRENT_USER_KEY, user);

    const recent = [
      { username: user.username, displayName: user.displayName },
      ...this.recentUsers().filter((r) => r.username !== user.username),
    ].slice(0, MAX_RECENT_USERS);
    this.recentUsers.set(recent);
    write(localStorage, RECENT_USERS_KEY, recent);
  }

  logout(): void {
    this.currentUser.set(null);
    try {
      sessionStorage.removeItem(CURRENT_USER_KEY);
    } catch {
      // Storage unavailable (e.g. private mode) - nothing to clear.
    }
  }
}

function read<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable - the app still works, it just won't remember.
  }
}
