import { describe, expect, it } from 'vitest';
import { classifyNpmAudit, isBlockingSecuritySeverity } from './security-scan-policy.mjs';

describe('security scan fail-closed policy', () => {
  it('blocks high and critical sections', () => {
    expect(isBlockingSecuritySeverity('high')).toBe(true);
    expect(isBlockingSecuritySeverity('critical')).toBe(true);
    expect(isBlockingSecuritySeverity('moderate')).toBe(false);
  });

  it('blocks npm high or critical vulnerabilities', () => {
    expect(classifyNpmAudit({ metadata: { vulnerabilities: { high: 1 } } }).blocking).toBe(true);
    expect(classifyNpmAudit({ metadata: { vulnerabilities: { critical: 1 } } }).blocking).toBe(true);
  });

  it('fails closed on malformed or unavailable audit output', () => {
    expect(classifyNpmAudit({}).blocking).toBe(true);
    expect(classifyNpmAudit({ error: 'network unavailable' }).severity).toBe('high');
  });

  it('allows a clean audit result', () => {
    expect(classifyNpmAudit({
      metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0, info: 0 } },
    })).toMatchObject({ severity: 'info', blocking: false });
  });
});
