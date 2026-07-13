import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearWalletAuthSession,
  getWalletAuthSession,
  setWalletAuthSession,
} from '@/utils/walletAuthSession';

function buildChallengeMessage(address: string, signedAt: number) {
  return [
    'Orina Wallet Session Authentication',
    '',
    'Sign this message to authenticate your session in Orina.',
    'No blockchain transaction or gas fee is required.',
    '',
    'Domain: app.orina.io',
    'URI: https://app.orina.io',
    `Address: ${address}`,
    'Chain ID: 97',
    `Nonce: ${'ab'.repeat(32)}`,
    `Issued At: ${new Date(signedAt).toISOString()}`,
    `Expiration Time: ${new Date(signedAt + 5 * 60 * 1000).toISOString()}`,
  ].join('\n');
}

function createStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe('walletAuthSession', () => {
  const address = '0x1234567890abcdef1234567890abcdef12345678';
  const signature = '0xdeadbeef';
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;

  beforeEach(() => {
    const localStorage = createStorage();
    const sessionStorage = createStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorage,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: sessionStorage,
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage,
        sessionStorage,
        dispatchEvent: vi.fn(),
      },
    });
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }

    if (originalLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, 'localStorage');
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }

    if (originalSessionStorage === undefined) {
      Reflect.deleteProperty(globalThis, 'sessionStorage');
    } else {
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: originalSessionStorage,
      });
    }
  });

  it('returns a stored session while it is still fresh', () => {
    const signedAt = Date.now();
    setWalletAuthSession(address, signature, {
      signedAt,
      message: buildChallengeMessage(address, signedAt),
    });

    expect(getWalletAuthSession()).toMatchObject({
      address,
      signature,
    });
  });

  it('clears an expired session instead of returning it', () => {
    const signedAt = Date.now() - (8 * 24 * 60 * 60 * 1000);
    setWalletAuthSession(address, signature, {
      signedAt,
      message: buildChallengeMessage(address, signedAt),
    });

    expect(getWalletAuthSession()).toBeNull();
    expect(globalThis.sessionStorage.getItem('orina_wallet_auth_session')).toBeNull();
  });

  it('keeps a session that is only a few minutes old', () => {
    const signedAt = Date.now() - (2 * 60 * 1000);
    setWalletAuthSession(address, signature, {
      signedAt,
      message: buildChallengeMessage(address, signedAt),
    });

    expect(getWalletAuthSession()).toMatchObject({
      address,
      signature,
    });
  });

  it('clears a session with an incompatible message', () => {
    setWalletAuthSession(address, signature, {
      signedAt: Date.now(),
      message: 'bad message',
    });

    expect(getWalletAuthSession()).toBeNull();
    expect(globalThis.sessionStorage.getItem('orina_wallet_auth_session')).toBeNull();
  });
});
