export interface AvatarColor {
  bg: string;
  fg: string;
}

const COLORS: AvatarColor[] = [
  { bg: '#dbe5fb', fg: '#2447a8' }, // blue
  { bg: '#fbe1d6', fg: '#a3401c' }, // peach
  { bg: '#dcefe3', fg: '#1d6b40' }, // green
  { bg: '#ebe1f8', fg: '#6532a8' }, // purple
  { bg: '#e9e8e3', fg: '#4a4a45' }, // grey
  { bg: '#fbe0ea', fg: '#a3264f' }, // pink
  { bg: '#fdf0cc', fg: '#8a5a00' }, // amber
  { bg: '#d7f0f2', fg: '#106a73' }, // teal
];

/** "Priya Sharma" -> "PS", "priya_s" -> "PS", "rahul" -> "RA". */
export function initials(name: string): string {
  const words = name.trim().split(/[\s_]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Same key always gets the same color, so a person looks the same everywhere. */
export function avatarColor(key: string): AvatarColor {
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
