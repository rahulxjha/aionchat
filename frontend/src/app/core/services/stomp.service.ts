import { Injectable, signal } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Owns the app's single WebSocket (STOMP) connection.
 * Subscriptions do not survive a reconnect, so callers re-subscribe in onConnect.
 */
@Injectable({ providedIn: 'root' })
export class StompService {
  readonly status = signal<ConnectionStatus>('disconnected');
  private client: Client | null = null;

  connect(username: string, onConnect: () => void): void {
    this.disconnect();

    const client = new Client({
      brokerURL: brokerUrl(username),
      reconnectDelay: 3000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onConnect: () => {
        this.status.set('connected');
        onConnect();
      },
      onWebSocketClose: () => {
        if (this.client === client) {
          this.status.set(client.active ? 'reconnecting' : 'disconnected');
        }
      },
      onStompError: (frame) => console.error('STOMP error:', frame.headers['message']),
    });

    this.client = client;
    this.status.set('connecting');
    client.activate();
  }

  disconnect(): void {
    if (!this.client) return;
    void this.client.deactivate();
    this.client = null;
    this.status.set('disconnected');
  }

  subscribe<T>(destination: string, handler: (body: T) => void): StompSubscription | null {
    if (!this.client?.connected) return null;
    return this.client.subscribe(destination, (frame) => handler(JSON.parse(frame.body) as T));
  }

  /** Returns false when offline, so the UI can tell the user the message was not sent. */
  publish(destination: string, body: unknown): boolean {
    if (!this.client?.connected) return false;
    this.client.publish({ destination, body: JSON.stringify(body) });
    return true;
  }
}

/**
 * Same host as the page; in development the Angular proxy forwards /ws to Spring Boot.
 * The server identifies the user from the username in this URL when the socket opens.
 */
function brokerUrl(username: string): string {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${location.host}/ws?username=${encodeURIComponent(username)}`;
}
