import { describe, it, expect } from 'vitest';
import { cn, formatBytes, formatDate } from '../lib/utils';

describe('Frontend Utilities Test Suite', () => {
  it('cn() correctly merges tailwind classes without duplicates', () => {
    const result = cn('px-4 py-2', 'bg-accent', { 'text-white': true, 'hidden': false });
    expect(result).toBe('px-4 py-2 bg-accent text-white');
  });

  it('formatBytes() formats byte units accurately', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('formatDate() formats recent and historical timestamps cleanly', () => {
    const now = new Date();
    expect(formatDate(now.toISOString())).toBe('1m ago');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatDate(twoHoursAgo.toISOString())).toBe('2h ago');
  });
});
