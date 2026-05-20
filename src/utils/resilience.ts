const DEFAULT_RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_CIRCUIT_FAILURE_STATUSES = new Set([500, 502, 503, 504]);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitSnapshot {
  key: string;
  state: CircuitState;
  failureCount: number;
  openedAt: number | null;
  nextProbeAt: number | null;
}

interface CircuitRecord {
  failureCount: number;
  openedAt: number | null;
}

export interface RetryPolicy {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  retryableStatuses?: number[];
  retryUnsafe?: boolean;
}

export interface CircuitPolicy {
  key: string;
  failureThreshold?: number;
  openMs?: number;
  failureStatuses?: number[];
}

export interface ResilientFetchPolicy {
  operation: string;
  timeoutMs: number;
  retry?: RetryPolicy;
  circuit?: CircuitPolicy;
  idempotencyKey?: string;
  requestId?: string;
}

export type ResilienceErrorCode = 'timeout' | 'circuit_open' | 'network_error';

export class ResilienceError extends Error {
  code: ResilienceErrorCode;
  operation: string;
  requestId: string;
  retryable: boolean;

  constructor(
    code: ResilienceErrorCode,
    message: string,
    options: { operation: string; requestId: string; retryable?: boolean },
  ) {
    super(message);
    this.name = 'ResilienceError';
    this.code = code;
    this.operation = options.operation;
    this.requestId = options.requestId;
    this.retryable = options.retryable ?? true;
  }
}

const circuits = new Map<string, CircuitRecord>();

function nowMs(): number {
  return Date.now();
}

function normalizeMethod(init?: RequestInit): string {
  return String(init?.method || 'GET').toUpperCase();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(values)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export function createRequestId(prefix = 'orina'): string {
  const cryptoApi = globalThis.crypto;
  const randomId = cryptoApi?.randomUUID ? cryptoApi.randomUUID() : randomHex(16);
  return `${prefix}-${randomId}`;
}

export function createIdempotencyKey(operation: string): string {
  return `${operation}:${createRequestId('idem')}`;
}

function readCircuitState(policy: CircuitPolicy): CircuitState {
  const record = circuits.get(policy.key);
  if (!record?.openedAt) return 'closed';
  const openMs = policy.openMs ?? 15_000;
  return nowMs() - record.openedAt >= openMs ? 'half-open' : 'open';
}

function recordCircuitSuccess(policy?: CircuitPolicy): void {
  if (!policy) return;
  circuits.delete(policy.key);
}

function recordCircuitFailure(policy?: CircuitPolicy): void {
  if (!policy) return;
  const threshold = policy.failureThreshold ?? 3;
  const record = circuits.get(policy.key) ?? { failureCount: 0, openedAt: null };
  const nextFailureCount = record.failureCount + 1;
  circuits.set(policy.key, {
    failureCount: nextFailureCount,
    openedAt: nextFailureCount >= threshold ? nowMs() : record.openedAt,
  });
}

function shouldCountCircuitFailure(response: Response, policy?: CircuitPolicy): boolean {
  if (!policy) return false;
  const statuses = new Set(policy.failureStatuses ?? Array.from(DEFAULT_CIRCUIT_FAILURE_STATUSES));
  return statuses.has(response.status);
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) {
    return Math.max(timestamp - nowMs(), 0);
  }
  return null;
}

function retryDelayMs(attemptIndex: number, retry: RetryPolicy, response?: Response): number {
  const retryAfterMs = parseRetryAfterMs(response?.headers.get('Retry-After') ?? null);
  if (retryAfterMs !== null) return Math.min(retryAfterMs, retry.maxDelayMs ?? 5_000);
  const baseDelayMs = retry.baseDelayMs ?? 250;
  const maxDelayMs = retry.maxDelayMs ?? 2_000;
  const exponential = Math.min(baseDelayMs * (2 ** Math.max(attemptIndex - 1, 0)), maxDelayMs);
  if (retry.jitter === false) return exponential;
  return Math.floor(exponential * (0.75 + Math.random() * 0.5));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(resolve, ms);
    const abort = () => {
      globalThis.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function createTimeoutSignal(timeoutMs: number, upstream?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  let timedOut = false;
  const timer = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Timed out', 'TimeoutError'));
  }, timeoutMs);

  const onUpstreamAbort = () => {
    controller.abort(upstream?.reason);
  };
  upstream?.addEventListener('abort', onUpstreamAbort, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      globalThis.clearTimeout(timer);
      upstream?.removeEventListener('abort', onUpstreamAbort);
      if (timedOut) {
        // Keep `timedOut` observable in this closure for debuggers without leaking it.
      }
    },
  };
}

function withResilienceHeaders(
  init: RequestInit | undefined,
  policy: ResilientFetchPolicy,
  method: string,
  requestId: string,
): Headers {
  const headers = new Headers(init?.headers);
  headers.set('X-Orina-Request-Id', requestId);
  headers.set('X-Orina-Operation', policy.operation);
  if (policy.idempotencyKey && method !== 'GET') {
    headers.set('Idempotency-Key', policy.idempotencyKey);
  }
  return headers;
}

function shouldRetryResponse(response: Response, method: string, policy: ResilientFetchPolicy): boolean {
  const retry = policy.retry;
  if (!retry) return false;
  const retryableStatuses = new Set(retry.retryableStatuses ?? Array.from(DEFAULT_RETRYABLE_STATUSES));
  if (!retryableStatuses.has(response.status)) return false;
  return retry.retryUnsafe === true || SAFE_METHODS.has(method) || Boolean(policy.idempotencyKey);
}

function shouldRetryError(error: unknown, method: string, policy: ResilientFetchPolicy): boolean {
  const retry = policy.retry;
  if (!retry) return false;
  if (!(error instanceof TypeError) && !isAbortError(error)) return false;
  return retry.retryUnsafe === true || SAFE_METHODS.has(method) || Boolean(policy.idempotencyKey);
}

export async function resilientFetch(input: RequestInfo | URL, init: RequestInit = {}, policy: ResilientFetchPolicy): Promise<Response> {
  const method = normalizeMethod(init);
  const requestId = policy.requestId || createRequestId();
  const circuitState = policy.circuit ? readCircuitState(policy.circuit) : 'closed';
  if (circuitState === 'open') {
    throw new ResilienceError(
      'circuit_open',
      `${policy.operation} is temporarily unavailable because its circuit breaker is open.`,
      { operation: policy.operation, requestId, retryable: false },
    );
  }

  const retry = policy.retry ?? {};
  const maxAttempts = Math.max(1, retry.maxAttempts ?? 1);
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { signal, cleanup } = createTimeoutSignal(policy.timeoutMs, init.signal);
    const headers = withResilienceHeaders(init, policy, method, requestId);
    headers.set('X-Orina-Attempt', String(attempt));

    try {
      const response = await fetch(input, {
        ...init,
        headers,
        signal,
      });

      if (shouldCountCircuitFailure(response, policy.circuit)) {
        recordCircuitFailure(policy.circuit);
      } else {
        recordCircuitSuccess(policy.circuit);
      }

      if (attempt < maxAttempts && shouldRetryResponse(response, method, policy)) {
        await sleep(retryDelayMs(attempt, retry, response), signal);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      recordCircuitFailure(policy.circuit);
      if (attempt < maxAttempts && shouldRetryError(error, method, policy)) {
        await sleep(retryDelayMs(attempt, retry), signal).catch(() => undefined);
        continue;
      }
      if (isAbortError(error)) {
        throw new ResilienceError(
          'timeout',
          `${policy.operation} timed out after ${policy.timeoutMs}ms.`,
          { operation: policy.operation, requestId },
        );
      }
      if (error instanceof TypeError) {
        throw new ResilienceError(
          'network_error',
          `${policy.operation} failed because the network request could not be completed.`,
          { operation: policy.operation, requestId },
        );
      }
      throw error;
    } finally {
      cleanup();
    }
  }

  throw new ResilienceError(
    'network_error',
    `${policy.operation} failed after ${maxAttempts} attempts.`,
    { operation: policy.operation, requestId, retryable: true },
  );
}

export function getCircuitSnapshot(key: string, policy: Omit<CircuitPolicy, 'key'> = {}): CircuitSnapshot {
  const circuitPolicy = { ...policy, key };
  const record = circuits.get(key) ?? { failureCount: 0, openedAt: null };
  const state = readCircuitState(circuitPolicy);
  const openMs = circuitPolicy.openMs ?? 15_000;
  return {
    key,
    state,
    failureCount: record.failureCount,
    openedAt: record.openedAt,
    nextProbeAt: record.openedAt ? record.openedAt + openMs : null,
  };
}

export function resetCircuitBreakers(): void {
  circuits.clear();
}

export function isResilienceError(error: unknown): error is ResilienceError {
  return error instanceof ResilienceError;
}
