import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveNIMBaseUrl, validateVisionImageUrl } from './nvidia-nim-client.ts';

describe('validateVisionImageUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('Deno', {
      env: {
        get: (name: string) => name === 'ATP2_AI_IMAGE_ALLOWED_HOSTS' ? 'images.example.com,127.0.0.1' : undefined,
      },
    });
  });

  it('allows only approved HTTPS image origins', () => {
    expect(validateVisionImageUrl('https://gateway.pinata.cloud/ipfs/bafy-test').valid).toBe(true);
    expect(validateVisionImageUrl('https://images.example.com/product.png').valid).toBe(true);
    expect(validateVisionImageUrl('http://images.example.com/product.png').valid).toBe(false);
    expect(validateVisionImageUrl('https://unapproved.example/product.png').valid).toBe(false);
  });

  it.each([
    'https://127.0.0.1/private.png',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/private.png',
    'https://[fc00::1]/private.png',
  ])('rejects literal-IP SSRF target %s', (url) => {
    expect(validateVisionImageUrl(url).valid).toBe(false);
  });

  it('rejects credentials, non-image data URLs, and oversized data images', () => {
    expect(validateVisionImageUrl('https://user:pass@images.example.com/a.png').valid).toBe(false);
    expect(validateVisionImageUrl('data:text/html;base64,PGgxPm5vPC9oMT4=').valid).toBe(false);
    expect(validateVisionImageUrl(`data:image/png;base64,${'A'.repeat(7 * 1024 * 1024)}`).valid).toBe(false);
  });

  it('never sends the NVIDIA API key to an arbitrary configured base URL', () => {
    expect(resolveNIMBaseUrl('https://integrate.api.nvidia.com/v1/')).toBe('https://integrate.api.nvidia.com/v1');
    expect(resolveNIMBaseUrl('https://attacker.example/v1')).toBe('https://integrate.api.nvidia.com/v1');
    expect(resolveNIMBaseUrl('https://user:pass@integrate.api.nvidia.com/v1')).toBe('https://integrate.api.nvidia.com/v1');
  });
});
