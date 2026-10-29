import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Message } from '../models/message';
import { Room } from '../models/room';
import { User } from '../models/user';

export interface MessagePage {
  /** Messages older than this id (scrolling up). */
  before?: number;
  /** Messages newer than this id (catching up after a reconnect). */
  after?: number;
  size?: number;
}

/** All REST calls. URLs are relative - the dev proxy forwards /api to Spring Boot. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /** Creates the user, or returns the existing one with that username. */
  join(username: string, displayName: string | null): Observable<User> {
    return this.http.post<User>('/api/users', { username, displayName });
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }

  /** Rooms the current user (X-Username header) is a member of. */
  getMyRooms(): Observable<Room[]> {
    return this.http.get<Room[]>('/api/rooms');
  }

  /** Returns the existing direct room with this user, or creates it. */
  openDirectRoom(username: string): Observable<Room> {
    return this.http.post<Room>('/api/rooms/direct', { username });
  }

  createGroup(name: string, memberUsernames: string[]): Observable<Room> {
    return this.http.post<Room>('/api/rooms/group', { name, memberUsernames });
  }

  /** One page of history, oldest first. */
  getMessages(roomId: number, page: MessagePage = {}): Observable<Message[]> {
    let params = new HttpParams().set('size', page.size ?? 30);
    if (page.before !== undefined) params = params.set('before', page.before);
    if (page.after !== undefined) params = params.set('after', page.after);
    return this.http.get<Message[]>(`/api/rooms/${roomId}/messages`, { params });
  }
}

/** The backend returns errors as { message }; fall back to a friendly default. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
    return err.error.message;
  }
  return fallback;
}
