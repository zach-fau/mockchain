import { describe, it, expect } from 'vitest';
import { generateId, createRequestHash, normalizeUrl, deepClone } from './utils';

describe('generateId', () => {
  it('should generate a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000);
  });

  it('should contain timestamp component', () => {
    const before = Date.now();
    const id = generateId();
    const after = Date.now();

    // ID format: {timestamp-base36}-{random}
    const timestampPart = id.split('-')[0];
    if (timestampPart) {
      const timestamp = parseInt(timestampPart, 36);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    }
  });

  it('should have consistent format', () => {
    const id = generateId();
    // Should match pattern: base36timestamp-randombase36
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });
});

describe('createRequestHash', () => {
  it('should create hash from method and URL', () => {
    const hash = createRequestHash('GET', '/api/users');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should produce different hashes for different methods', () => {
    const hash1 = createRequestHash('GET', '/api/users');
    const hash2 = createRequestHash('POST', '/api/users');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hashes for different URLs', () => {
    const hash1 = createRequestHash('GET', '/api/users');
    const hash2 = createRequestHash('GET', '/api/posts');
    expect(hash1).not.toBe(hash2);
  });

  it('should include body in hash calculation', () => {
    const hash1 = createRequestHash('POST', '/api/users', { name: 'Alice' });
    const hash2 = createRequestHash('POST', '/api/users', { name: 'Bob' });
    expect(hash1).not.toBe(hash2);
  });

  it('should produce same hash for same inputs', () => {
    const hash1 = createRequestHash('POST', '/api/users', { id: 1, name: 'Test' });
    const hash2 = createRequestHash('POST', '/api/users', { id: 1, name: 'Test' });
    expect(hash1).toBe(hash2);
  });

  it('should handle undefined body', () => {
    const hash1 = createRequestHash('GET', '/api/users');
    const hash2 = createRequestHash('GET', '/api/users', undefined);
    expect(hash1).toBe(hash2);
  });

  it('should handle null body', () => {
    const hash = createRequestHash('POST', '/api/users', null);
    expect(typeof hash).toBe('string');
  });

  it('should handle complex nested objects', () => {
    const complexBody = {
      user: {
        name: 'Test',
        addresses: [
          { street: '123 Main St', city: 'NYC' },
          { street: '456 Oak Ave', city: 'LA' },
        ],
      },
      metadata: { timestamp: 12345 },
    };
    const hash = createRequestHash('POST', '/api/users', complexBody);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });
});

describe('normalizeUrl', () => {
  it('should return valid URLs normalized', () => {
    const url = normalizeUrl('https://example.com/api/users');
    expect(url).toBe('https://example.com/api/users');
  });

  it('should sort query parameters', () => {
    const url = normalizeUrl('https://example.com/api?z=3&a=1&m=2');
    expect(url).toBe('https://example.com/api?a=1&m=2&z=3');
  });

  it('should handle URLs without query params', () => {
    const url = normalizeUrl('https://example.com/api/users/123');
    expect(url).toBe('https://example.com/api/users/123');
  });

  it('should return invalid URLs as-is', () => {
    const invalidUrl = '/api/users';
    expect(normalizeUrl(invalidUrl)).toBe('/api/users');
  });

  it('should return relative paths as-is', () => {
    const relativePath = '../api/users';
    expect(normalizeUrl(relativePath)).toBe('../api/users');
  });

  it('should handle URLs with special characters in query', () => {
    const url = normalizeUrl('https://example.com/search?q=hello%20world&filter=active');
    expect(url).toContain('filter=active');
    expect(url).toContain('q=hello');
  });

  it('should handle URLs with ports', () => {
    const url = normalizeUrl('http://localhost:3000/api/users?sort=name');
    expect(url).toBe('http://localhost:3000/api/users?sort=name');
  });

  it('should handle URLs with authentication', () => {
    const url = normalizeUrl('https://user:pass@example.com/api');
    expect(url).toContain('user:pass@example.com');
  });

  it('should handle URLs with fragments', () => {
    const url = normalizeUrl('https://example.com/page#section');
    expect(url).toContain('#section');
  });
});

describe('deepClone', () => {
  it('should clone primitive values', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
  });

  it('should clone arrays', () => {
    const original = [1, 2, 3];
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  it('should clone nested arrays', () => {
    const original = [
      [1, 2],
      [3, 4],
    ];
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned[0]).not.toBe(original[0]);
  });

  it('should clone objects', () => {
    const original = { name: 'Test', value: 42 };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  it('should clone nested objects', () => {
    const original = {
      level1: {
        level2: {
          value: 'deep',
        },
      },
    };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned.level1).not.toBe(original.level1);
    expect(cloned.level1.level2).not.toBe(original.level1.level2);
  });

  it('should clone objects with arrays', () => {
    const original = {
      items: [1, 2, 3],
      nested: { arr: ['a', 'b'] },
    };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned.items).not.toBe(original.items);
    expect(cloned.nested.arr).not.toBe(original.nested.arr);
  });

  it('should handle Date objects', () => {
    const original = { created: new Date('2024-01-01') };
    const cloned = deepClone(original);

    expect(cloned.created).toEqual(original.created);
    expect(cloned.created).not.toBe(original.created);
  });

  it('should not modify original when clone is modified', () => {
    const original = { name: 'Original', nested: { value: 1 } };
    const cloned = deepClone(original);

    cloned.name = 'Modified';
    cloned.nested.value = 999;

    expect(original.name).toBe('Original');
    expect(original.nested.value).toBe(1);
  });

  it('should clone complex captured pair structure', () => {
    const original = {
      request: {
        id: 'req-123',
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        body: { name: 'Test User', roles: ['admin', 'user'] },
        timestamp: Date.now(),
      },
      response: {
        status: 201,
        headers: { 'content-type': 'application/json' },
        body: { id: 1, name: 'Test User', roles: ['admin', 'user'] },
        responseTime: 150,
      },
    };

    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned.request).not.toBe(original.request);
    expect(cloned.response).not.toBe(original.response);
    expect(cloned.request.headers).not.toBe(original.request.headers);
    expect(cloned.request.body).not.toBe(original.request.body);
  });
});
