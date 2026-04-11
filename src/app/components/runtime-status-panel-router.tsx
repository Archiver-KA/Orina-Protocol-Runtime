/**
 * RuntimeStatusPanel — Router-aware runtime diagnostics
 * =====================================================
 * Mirrors the previous runtime panel but binds explorer/chain labels
 * to the canonical live protocol deployment instead of browsing selection.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import {
  useRuntimeProbe,
  probeSupabaseTables,
  type ProbeStatus,
  type SupabaseTableProbeResult,
} from '@/hooks/useRuntimeProbe';
import { EXPLORER_URLS } from '@/config/contracts';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';

function StatusIcon({ status, size = 14 }: { status: ProbeStatus; size?: number }) {
  if (status === 'loading') return <RefreshCw size={size} className="text-ui-muted animate-spin" />;
  if (status === 'ok') return <CheckCircle2 size={size} className="text-[#2CC295]" />;
  if (status === 'warn') return <AlertTriangle size={size} className="text-amber-400" />;
  return <XCircle size={size} className="text-red-400" />;
}

function statusBg(status: ProbeStatus) {
  if (status === 'ok') return 'bg-[#2CC295]/10 border-[#2CC295]/20';
  if (status === 'warn') return 'bg-amber-400/10 border-amber-400/20';
  if (status === 'error') return 'bg-red-400/10 border-red-400/20';
  return 'bg-[var(--t-surface-10)] border-transparent';
}

function statusText(status: ProbeStatus) {
  if (status === 'ok') return 'text-[#2CC295]';
  if (status === 'warn') return 'text-amber-400';
  if (status === 'error') return 'text-red-400';
  return 'text-ui-muted';
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatBps(bps: bigint) {
  return `${bps}bps (${Number(bps) / 100}%)`;
}

function formatAmount(amount: bigint) {
  return amount.toString();
}

function SectionHeader({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className="text-[10px] font-medium text-ui-muted uppercase tracking-widest">{label}</span>
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
          <span className={`text-[10px] font-mono font-semibold ${statusText(status)}`}>{value}</span>
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

export function RuntimeStatusPanel() {
  const report = useRuntimeProbe();
  const { chainId, networkLabel } = useProtocolDataNetwork();
  const [supabaseResults, setSupabaseResults] = useState<SupabaseTableProbeResult[]>([]);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSupabaseLoading(true);
    void probeSupabaseTables().then((results) => {
      if (cancelled) return;
      setSupabaseResults(results);
      setSupabaseLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const explorerBase = EXPLORER_URLS[(chainId ?? report.chain.expected) as keyof typeof EXPLORER_URLS];
  const allStatuses = [
    ...report.contracts.map((c) => c.status),
    report.fees?.status ?? 'warn',
    report.chain.status,
    ...report.units.map((u) => u.status),
    ...supabaseResults.map((s) => s.status),
  ] as ProbeStatus[];

  const summary = {
    total: allStatuses.length,
    ok: allStatuses.filter((s) => s === 'ok').length,
    warn: allStatuses.filter((s) => s === 'warn').length,
    error: allStatuses.filter((s) => s === 'error').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="text-[#2CC295]" size={20} />
          <h3 className="text-[10px] font-medium text-ui-muted uppercase tracking-widest">
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

      {!report.isLoading && (
        <SummaryBar
          ok={summary.ok}
          warn={summary.warn}
          error={summary.error}
          total={summary.total}
        />
      )}

      <div>
        <SectionHeader icon={<span className="text-[#2CC295] text-xs">⛓</span>} label="Chain Connectivity" />
        <ProbeRow
          label={report.chain.detail}
          value={`chainId: ${report.chain.chainId}`}
          status={report.chain.status}
        />
      </div>

      <div>
        <SectionHeader icon={<span className="text-[#2CC295] text-xs">📄</span>} label="Contract Liveness" />
        <div className="space-y-1.5">
          {report.isLoading
            ? Array.from({ length: 9 }).map((_, i) => (
                <ProbeRow key={i} label="Loading…" status="loading" />
              ))
            : report.contracts.length === 0
              ? <ProbeRow label={`${networkLabel} has no live deployment configured`} status="warn" />
              : report.contracts.map((c) => (
                  <ProbeRow
                    key={c.name}
                    label={c.name}
                    value={c.version ? `v${c.version}` : shortAddr(c.address)}
                    status={c.status}
                    sub={c.detail}
                    href={explorerBase ? `${explorerBase}/address/${c.address}` : undefined}
                  />
                ))}
        </div>
      </div>

      <div>
        <SectionHeader icon={<span className="text-[#2CC295] text-xs">💰</span>} label="Fee Manager Config" />
        {report.isLoading ? (
          <ProbeRow label="Loading fees…" status="loading" />
        ) : !report.fees ? (
          <ProbeRow label="Fee manager not available on this network" status="warn" />
        ) : (
          <div className="space-y-1.5">
            <ProbeRow
              label="Total fees"
              value={formatBps(report.fees.totalBps)}
              status={report.fees.status}
              sub={report.fees.detail}
            />
            <div className="grid grid-cols-3 gap-1.5">
              <ProbeRow label="Platform" value={formatBps(report.fees.platformBps)} status="ok" />
              <ProbeRow label="DAO" value={formatBps(report.fees.daoBps)} status="ok" />
              <ProbeRow label="Burn" value={formatBps(report.fees.burnBps)} status="ok" />
            </div>
          </div>
        )}
      </div>

      <div>
        <SectionHeader icon={<span className="text-[#2CC295] text-xs">📏</span>} label="UnitRegistry Seeds" />
        <div className="grid grid-cols-3 gap-1.5">
          {report.isLoading
            ? Array.from({ length: 9 }).map((_, i) => (
                <ProbeRow key={i} label="…" status="loading" />
              ))
            : report.units.length === 0
              ? <ProbeRow label="No seeded units available on this network" status="warn" />
              : report.units.map((u) => (
                  <ProbeRow
                    key={u.id}
                    label={u.name}
                    value={u.step > 0n ? `step:${formatAmount(u.step)}` : 'ERR'}
                    status={u.status}
                    sub={u.active ? `min: ${u.minAmount.toString()}` : 'inactive'}
                  />
                ))}
        </div>
      </div>

      <div>
        <SectionHeader icon={<span className="text-[#2CC295] text-xs">🗄</span>} label="Supabase Runtime Tables" />
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

      <p className="text-[10px] text-ui-muted text-center">
        {networkLabel} {chainId ? `(chainId ${chainId})` : ''} · Protocol v3.4 · Probed at {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}
