export interface User {
  id: number;
  username: string;
  displayName: string | null;
  online: boolean;
  lastSeenAt: string | null;
}
