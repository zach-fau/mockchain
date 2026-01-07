/**
 * Generate a unique identifier
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a hash from request details for matching purposes
 */
export function createRequestHash(method: string, url: string, body?: unknown): string {
  const bodyString = body ? JSON.stringify(body) : '';
  return `${method}:${url}:${simpleHash(bodyString)}`;
}

/**
 * Simple string hash function (djb2)
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Deep clone an object using structured clone
 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/**
 * Normalize URL for consistent matching
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Sort query params for consistent matching
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    // If not a valid URL, return as-is
    return url;
  }
}
