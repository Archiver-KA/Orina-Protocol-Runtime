import { describe, expect, it } from 'vitest';
import { canAccessPage, canUseCapability } from '@/app/access/access-policy';

describe('access-policy profile visibility', () => {
  it('allows guest users to open public profiles', () => {
    expect(canAccessPage('guest_disconnected', 'profile')).toBe(true);
    expect(canAccessPage('guest_forced', 'profile')).toBe(true);
  });

  it('grants public profile viewing capability to guests', () => {
    expect(canUseCapability('guest_disconnected', 'view_profile')).toBe(true);
    expect(canUseCapability('guest_forced', 'view_profile')).toBe(true);
  });
});