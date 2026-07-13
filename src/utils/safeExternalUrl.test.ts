import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from '@/utils/safeExternalUrl';

describe('safeExternalUrl', () => {
  it('allows absolute public HTTPS links', () => {
    expect(safeExternalUrl('https://example.com/path')).toBe('https://example.com/path');
  });

  it.each([
    `${'java'}script:alert(1)`,
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    '//evil.example/path',
    '/relative/path',
    'http://example.com/path',
    'https://user:pass@example.com/path',
    'https://127.0.0.1/internal',
    'https://[::1]/internal',
    'https://service.local/internal',
  ])('rejects unsafe or ambiguous link %s', (value) => {
    expect(safeExternalUrl(value)).toBeUndefined();
  });
});
