import { User } from '../models/user';

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

/** "10:09" */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

export function sameDay(a: string, b: string): boolean {
  return isSameDay(new Date(a), new Date(b));
}

/** Divider in the message list: "Today", "Yesterday", "Mon, 26 Oct". */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (isSameDay(date, new Date())) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Time next to a chat in the sidebar: "10:09", "Yesterday", "26 Oct". */
export function formatListTime(iso: string): string {
  const date = new Date(iso);
  if (isSameDay(date, new Date())) return formatTime(iso);
  if (isYesterday(date)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "Online", "Last seen 5m ago", "Last seen 2h ago", "Last seen yesterday". */
export function lastSeenLabel(user: User | null | undefined): string {
  if (!user) return '';
  if (user.online) return 'Online';
  if (!user.lastSeenAt) return 'Offline';

  const seen = new Date(user.lastSeenAt);
  const minutes = Math.floor((Date.now() - seen.getTime()) / 60_000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  if (isSameDay(seen, new Date())) return `Last seen ${Math.floor(minutes / 60)}h ago`;
  if (isYesterday(seen)) return 'Last seen yesterday';
  return `Last seen ${seen.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}
