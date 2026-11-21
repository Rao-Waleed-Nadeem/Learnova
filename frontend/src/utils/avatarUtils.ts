/**
 * Avatar utility helpers for URL detection and initials extraction.
 */

export function isAvatarImageUrl(src?: string | null): boolean {
  if (!src) return false;
  return (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:image/') ||
    src.startsWith('/')
  );
}

export function getAvatarFallbackInitials(
  name?: string | null,
  fallbackText?: string
): string {
  if (fallbackText && fallbackText.trim()) {
    return fallbackText.trim().slice(0, 2).toUpperCase();
  }
  if (name && name.trim()) {
    return name.trim().slice(0, 2).toUpperCase();
  }
  return 'ST';
}
