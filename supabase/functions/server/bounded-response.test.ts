import { describe, expect, it } from 'vitest';
import { readBoundedJson, readBoundedResponseBytes } from './bounded-response.ts';

describe('bounded remote response reader', () => {
  it('parses JSON below the configured limit', async () => {
    const response = new Response(JSON.stringify({ ok: true }));
    await expect(readBoundedJson<{ ok: boolean }>(response, 64)).resolves.toEqual({ ok: true });
  });

  it('rejects an oversized declared content length before reading', async () => {
    const response = new Response('small', { headers: { 'content-length': '1000' } });
    await expect(readBoundedResponseBytes(response, 32)).rejects.toThrow('exceeds');
  });

  it('rejects a streamed body that crosses the limit', async () => {
    const response = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(20));
        controller.enqueue(new Uint8Array(20));
        controller.close();
      },
    }));
    await expect(readBoundedResponseBytes(response, 32)).rejects.toThrow('exceeds');
  });
});
