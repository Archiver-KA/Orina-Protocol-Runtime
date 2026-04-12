import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildWalletAuthMessage,
  clearWalletAuthSession,
  getWalletAuthSession,
  setWalletAuthSession,
} from '@/utils/walletAuthSession';

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

  beforeEach(() => {
    const storage = createStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: storage,
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
  });

  it('returns a stored session while it is still fresh', () => {
    const signedAt = Date.now();
    setWalletAuthSession(address, signature, {
      signedAt,
      message: buildWalletAuthMessage(address, signedAt),
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
      message: buildWalletAuthMessage(address, signedAt),
    });

    expect(getWalletAuthSession()).toBeNull();
    expect(globalThis.localStorage.getItem('orina_wallet_auth_session')).toBeNull();
  });

  it('keeps a session that is only a few hours old', () => {
    const signedAt = Date.now() - (6 * 60 * 60 * 1000);
    setWalletAuthSession(address, signature, {
      signedAt,
      message: buildWalletAuthMessage(address, signedAt),
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
    expect(globalThis.localStorage.getItem('orina_wallet_auth_session')).toBeNull();
  });
});
