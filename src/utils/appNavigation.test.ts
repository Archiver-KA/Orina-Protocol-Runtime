import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APP_NAVIGATION_EVENT,
  dispatchAppNavigation,
  navigateToMarketplaceCategory,
  navigateToSearchResults,
} from '@/utils/appNavigation';

class TestCustomEvent<T> extends Event {
  detail: T;

  constructor(type: string, eventInitDict?: CustomEventInit<T>) {
    super(type);
    this.detail = eventInitDict?.detail as T;
  }
}

const originalWindow = globalThis.window;
const originalCustomEvent = globalThis.CustomEvent;

function installWindow() {
  const dispatchEvent = vi.fn();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      dispatchEvent,
    },
  });

  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    value: TestCustomEvent,
  });

  return dispatchEvent;
}

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
  } else {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  }

  if (originalCustomEvent === undefined) {
    Reflect.deleteProperty(globalThis, 'CustomEvent');
  } else {
    Object.defineProperty(globalThis, 'CustomEvent', {
      configurable: true,
      value: originalCustomEvent,
    });
  }
});

describe('appNavigation', () => {
  it('dispatches trimmed search navigation details', () => {
    const dispatchEvent = installWindow();

    navigateToSearchResults({
      query: '  copper wire  ',
      category: '  metals  ',
      subcategory: '  industrial  ',
    });

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const [event] = dispatchEvent.mock.calls[0] as [Event & { detail: unknown }];
    expect(event.type).toBe(APP_NAVIGATION_EVENT);
    expect(event.detail).toEqual({
      page: 'search',
      query: 'copper wire',
      category: 'metals',
      subcategory: 'industrial',
    });
  });

  it('uses subcategory as marketplace category fallback when category is empty', () => {
    const dispatchEvent = installWindow();

    navigateToMarketplaceCategory({
      category: '   ',
      subcategory: 'solar-panels',
    });

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const [event] = dispatchEvent.mock.calls[0] as [Event & { detail: unknown }];
    expect(event.detail).toEqual({
      page: 'marketplace',
      category: 'solar-panels',
      subcategory: 'solar-panels',
    });
  });

  it('no-ops safely when window is unavailable', () => {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }

    expect(() => dispatchAppNavigation({ page: 'search' })).not.toThrow();
  });
});