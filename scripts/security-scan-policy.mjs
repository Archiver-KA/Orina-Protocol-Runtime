export const BLOCKING_SECURITY_SEVERITIES = new Set(['critical', 'high']);

export function isBlockingSecuritySeverity(severity) {
  return BLOCKING_SECURITY_SEVERITIES.has(String(severity || '').toLowerCase());
}

export function classifyNpmAudit(audit) {
  const vulnerabilities = audit?.metadata?.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== 'object') {
    return { severity: 'high', blocking: true, reason: 'npm audit result is missing or malformed' };
  }

  const critical = Number(vulnerabilities.critical || 0);
  const high = Number(vulnerabilities.high || 0);
  const moderate = Number(vulnerabilities.moderate || 0);
  const severity = critical > 0 || high > 0 ? 'high' : moderate > 0 ? 'moderate' : 'info';
  return {
    severity,
    blocking: critical > 0 || high > 0,
    reason: critical > 0 || high > 0 ? 'npm audit reported high or critical vulnerabilities' : '',
  };
}
