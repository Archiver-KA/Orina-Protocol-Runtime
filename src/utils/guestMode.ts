const GUEST_MODE_KEY = 'orina_force_guest_mode';

export function isGuestModeForced(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(GUEST_MODE_KEY) === 'true';
}

export function setGuestModeForced(forced: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_MODE_KEY, forced ? 'true' : 'false');
  window.dispatchEvent(new Event('orina:guest-mode-change'));
}

export function clearGuestModeForced() {
  setGuestModeForced(false);
}
