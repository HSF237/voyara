import { cn } from '@/lib/cn';

export type RoutePoint = { id: string; lat: number; lng: number; label: string; name: string };

/**
 * A drawn version of the day's route: numbered stops joined in order. Used
 * while the real map loads, and in its place when there is no map key or the
 * device cannot draw one.
 */
export function RouteSketch({
  points,
  activeId,
  className,
}: {
  points: RoutePoint[];
  activeId?: string;
  className?: string;
}) {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const south = Math.min(...lats);
  const west = Math.min(...lngs);
  // One scale for both axes keeps the shape true; longitude shrinks away from the equator.
  const squeeze = Math.cos(((south + Math.max(...lats)) / 2) * (Math.PI / 180));
  const span = Math.max(Math.max(...lats) - south, (Math.max(...lngs) - west) * squeeze, 0.002);
  const at = (point: RoutePoint) => ({
    x: 14 + (((point.lng - west) * squeeze) / span) * 72,
    y: 86 - ((point.lat - south) / span) * 72,
  });
  const placed = points.map((point) => ({ point, ...at(point) }));

  return (
    <div className={cn('relative size-full overflow-hidden bg-surface-2', className)}>
      <svg
        viewBox="0 0 100 100"
        className="size-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <pattern id="sketch-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" className="stroke-line" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#sketch-grid)" />
        {placed.length > 1 && (
          <polyline
            points={placed.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill="none"
            className="stroke-primary"
            strokeWidth="0.9"
            strokeDasharray="1.2 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {placed.map(({ point, x, y }) => (
          <g key={point.id}>
            <circle
              cx={x}
              cy={y}
              r={point.id === activeId ? 5 : 4}
              className={cn(
                'stroke-surface',
                point.id === activeId ? 'fill-accent' : 'fill-primary',
              )}
              strokeWidth="0.8"
            />
            <text
              x={x}
              y={y + 1.4}
              textAnchor="middle"
              fontSize="4"
              fontWeight="700"
              className={point.id === activeId ? 'fill-on-accent' : 'fill-on-primary'}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
