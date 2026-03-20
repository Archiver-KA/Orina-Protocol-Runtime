/**
 * RuntimeStatusPanel — Phase 3A
 * ================================
 * Hiển thị trạng thái runtime của toàn bộ hệ thống:
 *   - Chain connectivity
 *   - 9 contract liveness
 *   - UnitRegistry seeds (9 units)
 *   - FeeManager config
 *   - Supabase tables
 */

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import {
  useRuntimeProbe,
  probeSupabaseTables,
  type ProbeStatus,
  type SupabaseTableProbeResult,
} from '@/hooks/useRuntimeProbe';
import { EXPLORER_URLS, ACTIVE_CHAIN_ID } from '@/config/contracts';

// ── Status Icon ────────────────────────────────────────────────

function StatusIcon({ status, size = 14 }: { status: ProbeStatus; size?: number }) {
  if (status === 'loading') return <RefreshCw size={size} className="text-ui-muted animate-spin" />;
  if (status === 'ok')      return <CheckCircle2 size={size} className="text-[#2CC295]" />;
  if (status === 'warn')    return <AlertTriangle size={size} className="text-amber-400" />;
  return <XCircle size={size} className="text-red-400" />;
}

function statusBg(status: ProbeStatus) {
  if (status === 'ok')   return 'bg-[#2CC295]/10 border-[#2CC295]/20';
  if (status === 'warn') return 'bg-amber-400/10 border-amber-400/20';
  if (status === 'error') return 'bg-red-400/10 border-red-400/20';
  return 'bg-[var(--t-surface-10)] border-transparent';
}

function statusText(status: ProbeStatus) {
  if (status === 'ok')    return 'text-[#2CC295]';
  if (status === 'warn')  return 'text-amber-400';
  if (status === 'error') return 'text-red-400';
  return 'text-ui-muted';
}

// ── Formatters ─────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatBps(bps: bigint) {
  return `${bps}bps (${Number(bps) / 100}%)`;
}

function formatAmount(amount: bigint, step: bigint) {
  if (step === 0n) return amount.toString();
  return amount.toString();
}

// ── Sub-sections ───────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">{label}</span>
    </div>
  );
}

function ProbeRow({
  label,
  value,
  status,
  sub,
  href,
}: {
  label: string;
  value?: string;
  status: ProbeStatus;
  sub?: string;
  href?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 p-2.5 rounded-lg border ${statusBg(status)}`}>
      <div className="flex items-center gap-2 min-w-0">
        <StatusIcon status={status} />
        <div className="min-w-0">
          <span className="text-xs font-medium text-ui-primary truncate block">{label}</span>
          {sub && <span className="text-[10px] text-ui-muted truncate block">{sub}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {value && (
          <span className={`text-[10px] font-mono font-bold ${statusText(status)}`}>{value}</span>
        )}
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100">
            <ExternalLink size={10} className="text-ui-muted" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ────────────────────────────────────────────────

function SummaryBar({ ok, warn, error, total }: { ok: number; warn: number; error: number; total: number }) {
  const overallStatus: ProbeStatus = error > 0 ? 'error' : warn > 0 ? 'warn' : 'ok';
  const label = error > 0
    ? `${error} error${error > 1 ? 's' : ''} detected`
    : warn > 0
    ? `${warn} warning${warn > 1 ? 's' : ''}`
    : 'All systems operational';

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${statusBg(overallStatus)}`}>
      <div className="flex items-center gap-2">
        <StatusIcon status={overallStatus} size={16} />
        <span className={`text-xs font-semibold ${statusText(overallStatus)}`}>{label}</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-ui-muted font-mono">
        <span className="text-[#2CC295]">{ok} ok</span>
        {warn > 0 && <span className="text-amber-400">{warn} warn</span>}
        {error > 0 && <span className="text-red-400">{error} err</span>}
        <span>/ {total}</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export function RuntimeStatusPanel() {
  const report = useRuntimeProbe();
  const [supabaseResults, setSupabaseResults] = useState<SupabaseTableProbeResult[]>([]);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setSupabaseLoading(true);
    probeSupabaseTables().then((results) => {
      setSupabaseResults(results);
      setSupabaseLoading(false);
    });
  }, [refreshKey]);

  const explorerBase = EXPLORER_URLS[ACTIVE_CHAIN_ID as keyof typeof EXPLORER_URLS];

  // Full summary includes supabase
  const allStatuses = [
    ...report.contracts.map((c) => c.status),
    report.fees?.status ?? 'error',
    report.chain.status,
    ...report.units.map((u) => u.status),
    ...supabaseResults.map((s) => s.status),
  ] as ProbeStatus[];

  const summary = {
    total: allStatuses.length,
    ok:    allStatuses.filter((s) => s === 'ok').length,
    warn:  allStatuses.filter((s) => s === 'warn').length,
    error: allStatuses.filter((s) => s === 'error').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="text-[#2CC295]" size={20} />
          <h3 className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">
            Protocol Runtime Status
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--t-surface-10)] hover:bg-[var(--t-surface-2)] text-ui-muted hover:text-ui-primary transition-all text-[10px] font-medium"
          title="Refresh probe"
        >
          <RefreshCw size={10} className={report.isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      {!report.isLoading && (
        <SummaryBar
          ok={summary.ok}
          warn={summary.warn}
          error={summary.error}
          total={summary.total}
        />
      )}

      {/* ── 1. Chain ────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<span className="text-[#2CC295] text-xs">⛓</span>}
          label="Chain Connectivity"
        />
        <ProbeRow
          label={report.chain.detail}
          value={`chainId: ${report.chain.chainId}`}
          status={report.chain.status}
        />
      </div>

      {/* ── 2. Contracts ────────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<span className="text-[#2CC295] text-xs">📄</span>}
          label="Contract Liveness"
        />
        <div className="space-y-1.5">
          {report.isLoading
            ? Array.from({ length: 9 }).map((_, i) => (
                <ProbeRow key={i} label="Loading…" status="loading" />
              ))
            : report.contracts.map((c) => (
                <ProbeRow
                  key={c.name}
                  label={c.name}
                  value={c.version ? `v${c.version}` : shortAddr(c.address)}
                  status={c.status}
                  sub={c.detail}
                  href={`${explorerBase}/address/${c.address}`}
                />
              ))}
        </div>
      </div>

      {/* ── 3. FeeManager ───────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<span className="text-[#2CC295] text-xs">💰</span>}
          label="Fee Manager Config"
        />
        {report.isLoading || !report.fees ? (
          <ProbeRow label="Loading fees…" status="loading" />
        ) : (
          <div className="space-y-1.5">
            <ProbeRow
              label="Total fees"
              value={formatBps(report.fees.totalBps)}
              status={report.fees.status}
              sub={report.fees.detail}
            />
            <div className="grid grid-cols-3 gap-1.5">
              <ProbeRow
                label="Platform"
                value={formatBps(report.fees.platformBps)}
                status="ok"
              />
              <ProbeRow
                label="DAO"
                value={formatBps(report.fees.daoBps)}
                status="ok"
              />
              <ProbeRow
                label="Burn"
                value={formatBps(report.fees.burnBps)}
                status="ok"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 4. UnitRegistry Seeds ───────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<span className="text-[#2CC295] text-xs">📏</span>}
          label="UnitRegistry Seeds"
        />
        <div className="grid grid-cols-3 gap-1.5">
          {report.isLoading
            ? Array.from({ length: 9 }).map((_, i) => (
                <ProbeRow key={i} label="…" status="loading" />
              ))
            : report.units.map((u) => (
                <ProbeRow
                  key={u.id}
                  label={u.name}
                  value={u.step > 0n ? `step:${formatAmount(u.step, u.step)}` : 'ERR'}
                  status={u.status}
                  sub={u.active ? `min: ${u.minAmount.toString()}` : 'inactive'}
                />
              ))}
        </div>
      </div>

      {/* ── 5. Supabase Tables ──────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<span className="text-[#2CC295] text-xs">🗄</span>}
          label="Supabase Runtime Tables"
        />
        <div className="space-y-1.5">
          {supabaseLoading
            ? ['protocol_assets', 'protocol_orders'].map((t) => (
                <ProbeRow key={t} label={t} status="loading" />
              ))
            : supabaseResults.map((r) => (
                <ProbeRow
                  key={r.table}
                  label={r.table}
                  status={r.status}
                  sub={r.detail}
                />
              ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-ui-muted text-center">
        BSC Testnet (chainId 97) · Protocol v3.4 · Probed at {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}
