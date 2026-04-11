import { useMemo, useState } from 'react';

export interface MetricChartPoint {
  key: string;
  label: string;
  primaryValue: number;
  secondaryValue?: number;
  details?: Array<{ label: string; value: string }>;
}

interface MarketVolumeChartProps {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  points?: MetricChartPoint[];
  emptyMessage?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function MarketVolumeChart({
  title = 'Order Activity',
  subtitle = 'Created and finalized orders',
  primaryLabel = 'Created',
  secondaryLabel = 'Finalized',
  points = [],
  emptyMessage = 'No chart data available for this window.',
}: MarketVolumeChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(points.length > 0 ? points.length - 1 : null);

  const safePoints = useMemo(
    () => points.map((point) => ({ ...point, secondaryValue: point.secondaryValue ?? 0 })),
    [points],
  );

  const geometry = useMemo(() => {
    if (safePoints.length === 0) {
      return {
        primaryAreaPath: '',
        primaryLinePath: '',
        secondaryLinePath: '',
        scaledPoints: [] as Array<MetricChartPoint & { x: number; primaryY: number; secondaryY: number }>,
        maxValue: 0,
      };
    }

    const width = 1000;
    const height = 320;
    const padding = 28;
    const innerWidth = width - (padding * 2);
    const innerHeight = height - (padding * 2);
    const maxValue = Math.max(
      1,
      ...safePoints.map((point) => Math.max(point.primaryValue, point.secondaryValue ?? 0)),
    );

    const scaledPoints = safePoints.map((point, index) => {
      const x = padding + (safePoints.length === 1 ? innerWidth / 2 : (index / (safePoints.length - 1)) * innerWidth);
      const primaryY = padding + innerHeight - ((point.primaryValue / maxValue) * innerHeight);
      const secondaryY = padding + innerHeight - (((point.secondaryValue ?? 0) / maxValue) * innerHeight);
      return { ...point, x, primaryY, secondaryY };
    });

    const toPath = (key: 'primaryY' | 'secondaryY') =>
      scaledPoints
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point[key]}`)
        .join(' ');

    const primaryLinePath = toPath('primaryY');
    const secondaryLinePath = toPath('secondaryY');
    const firstX = scaledPoints[0]?.x ?? padding;
    const lastX = scaledPoints[scaledPoints.length - 1]?.x ?? (width - padding);
    const primaryAreaPath = `${primaryLinePath} L ${lastX} ${height - padding} L ${firstX} ${height - padding} Z`;

    return {
      primaryAreaPath,
      primaryLinePath,
      secondaryLinePath,
      scaledPoints,
      maxValue,
    };
  }, [safePoints]);

  const hoveredPoint = hoveredIndex !== null ? geometry.scaledPoints[clamp(hoveredIndex, 0, geometry.scaledPoints.length - 1)] : null;

  return (
    <div className="bg-ui-card rounded-[24px] p-6 backdrop-blur-[10px]">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ui-primary">{title}</h3>
          <p className="text-xs text-ui-muted uppercase tracking-widest mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#2CC295]"></div>
            <span className="text-xs font-medium text-ui-secondary">{primaryLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F7DC7F]"></div>
            <span className="text-xs font-medium text-ui-secondary">{secondaryLabel}</span>
          </div>
        </div>
      </div>

      {safePoints.length === 0 ? (
        <div className="h-80 rounded-[20px] border border-ui-border-subtle bg-ui-card/50 flex items-center justify-center text-sm text-ui-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="h-80 relative">
          {hoveredPoint && (
            <div className="absolute left-0 top-0 z-10 max-w-[240px] rounded-[18px] border border-ui-border-subtle bg-ui-card/95 backdrop-blur px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ui-muted">{hoveredPoint.label}</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-ui-secondary">{primaryLabel}</span>
                  <span className="text-xs font-semibold text-ui-primary">{hoveredPoint.primaryValue}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-ui-secondary">{secondaryLabel}</span>
                  <span className="text-xs font-semibold text-ui-primary">{hoveredPoint.secondaryValue}</span>
                </div>
                {hoveredPoint.details?.map((detail) => (
                  <div key={`${hoveredPoint.key}-${detail.label}`} className="flex items-center justify-between gap-4">
                    <span className="text-[11px] text-ui-muted">{detail.label}</span>
                    <span className="text-[11px] font-medium text-ui-secondary">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <svg className="w-full h-full" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 320">
            <defs>
              <linearGradient id="protocolPrimaryGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2CC295" stopOpacity="0.2"></stop>
                <stop offset="100%" stopColor="#2CC295" stopOpacity="0"></stop>
              </linearGradient>
            </defs>

            {Array.from({ length: 4 }, (_, index) => {
              const y = 28 + (index * ((320 - 56) / 3));
              return (
                <line
                  key={`grid-${index}`}
                  x1="28"
                  y1={y}
                  x2="972"
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
              );
            })}

            <path d={geometry.primaryAreaPath} fill="url(#protocolPrimaryGradient)"></path>
            <path d={geometry.primaryLinePath} fill="none" stroke="#2CC295" strokeWidth="3"></path>
            <path d={geometry.secondaryLinePath} fill="none" stroke="#F7DC7F" strokeWidth="2" strokeDasharray="6 4"></path>

            {geometry.scaledPoints.map((point, index) => (
              <g key={point.key}>
                <circle
                  cx={point.x}
                  cy={point.primaryY}
                  r={hoveredIndex === index ? 6 : 4}
                  fill="#2CC295"
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  onMouseEnter={() => setHoveredIndex(index)}
                />
                <circle
                  cx={point.x}
                  cy={point.secondaryY}
                  r={hoveredIndex === index ? 5 : 3.5}
                  fill="#F7DC7F"
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  onMouseEnter={() => setHoveredIndex(index)}
                />
              </g>
            ))}
          </svg>

          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-ui-muted uppercase font-mono py-2">
            {safePoints.map((point) => (
              <span
                key={`label-${point.key}`}
                className={`transition-colors ${hoveredPoint?.key === point.key ? 'text-ui-primary' : ''}`}
                onMouseEnter={() => setHoveredIndex(safePoints.findIndex((value) => value.key === point.key))}
              >
                {point.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
