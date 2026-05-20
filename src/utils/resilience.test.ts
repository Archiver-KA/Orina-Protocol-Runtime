import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ResilienceError,
  getCircuitSnapshot,
  resilientFetch,
  resetCircuitBreakers,
} from './resilience';

afterEach(() => {
  vi.restoreAllMocks();
  resetCircuitBreakers();
});

describe('resilientFetch', () => {
  it('retries safe reads on transient responses with stable request id', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await resilientFetch('/resource', { method: 'GET' }, {
      operation: 'test-read',
      timeoutMs: 1000,
      requestId: 'orina-test-read',
      retry: { maxAttempts: 2, baseDelayMs: 0, jitter: false },
      circuit: { key: 'test-read', failureThreshold: 3, openMs: 1000 },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstHeaders = fetchMock.mock.calls[0][1].headers as Headers;
    const secondHeaders = fetchMock.mock.calls[1][1].headers as Headers;
    expect(firstHeaders.get('X-Orina-Request-Id')).toBe('orina-test-read');
    expect(secondHeaders.get('X-Orina-Request-Id')).toBe('orina-test-read');
    expect(secondHeaders.get('X-Orina-Attempt')).toBe('2');
  });

  it('does not retry unsafe writes unless an idempotency key is present', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('busy', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await resilientFetch('/write', { method: 'POST' }, {
      operation: 'test-write',
      timeoutMs: 1000,
      retry: { maxAttempts: 3, baseDelayMs: 0, jitter: false },
    });

    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries writes when an idempotency key is present', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await resilientFetch('/write', { method: 'POST' }, {
      operation: 'test-idempotent-write',
      timeoutMs: 1000,
      idempotencyKey: 'idem-123',
      retry: { maxAttempts: 2, baseDelayMs: 0, jitter: false },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Idempotency-Key')).toBe('idem-123');
  });

  it('honors idempotent in-progress retry responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('pending', { status: 425, headers: { 'Retry-After': '0' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await resilientFetch('/write', { method: 'POST' }, {
      operation: 'test-idempotent-in-progress',
      timeoutMs: 1000,
      idempotencyKey: 'idem-425',
      retry: { maxAttempts: 2, baseDelayMs: 0, jitter: false },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('opens a circuit after repeated dependency failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('down', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const policy = {
      operation: 'test-circuit',
      timeoutMs: 1000,
      circuit: { key: 'test-circuit', failureThreshold: 2, openMs: 10_000 },
    };

    await resilientFetch('/dependency', { method: 'GET' }, policy);
    await resilientFetch('/dependency', { method: 'GET' }, policy);

    expect(getCircuitSnapshot('test-circuit').state).toBe('open');

    await expect(resilientFetch('/dependency', { method: 'GET' }, policy))
      .rejects.toBeInstanceOf(ResilienceError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
