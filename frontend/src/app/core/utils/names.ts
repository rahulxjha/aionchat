export function displayName(user: { username: string; displayName: string | null }): string {
  return user.displayName || user.username;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}
