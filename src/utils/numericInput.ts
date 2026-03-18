import type { KeyboardEvent } from 'react';

export function preventInvalidNumberKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (['e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault();
  }
}

export function extractNumericValue(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? match[0] : '';
}
