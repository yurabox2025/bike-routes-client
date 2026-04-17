import { useMemo, useRef, useState } from 'react';
import type { RouteProfile } from '../types';
import { formatDistanceMeters, formatElevationMeters } from '../utils';

interface Props {
  profile: RouteProfile;
}

function formatSlope(value: number | null): string {
  if (typeof value !== 'number') {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}

function formatAngle(value: number | null): string {
  if (typeof value !== 'number') {
    return '—';
  }
  return `${value.toFixed(1)}°`;
}

function formatPointTime(value?: string): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

export function ElevationProfile({ profile }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const samples = useMemo(() => profile.samples.filter((sample) => typeof sample.elevationMeters === 'number'), [profile.samples]);

  const layout = {
    width: 980,
    height: 250,
    padTop: 16,
    padRight: 12,
    padBottom: 30,
    padLeft: 40
  };

  const graphWidth = layout.width - layout.padLeft - layout.padRight;
  const graphHeight = layout.height - layout.padTop - layout.padBottom;

  const totalDistance = Math.max(profile.totalDistanceMeters, 1);

  const [minElevation, maxElevation] = useMemo(() => {
    if (samples.length === 0) {
      return [0, 1] as const;
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const sample of samples) {
      const elevation = sample.elevationMeters as number;
      min = Math.min(min, elevation);
      max = Math.max(max, elevation);
    }

    const span = Math.max(1, max - min);
    const padding = Math.max(5, span * 0.08);
    return [Math.floor(min - padding), Math.ceil(max + padding)] as const;
  }, [samples]);

  const ySpan = Math.max(1, maxElevation - minElevation);

  const points = useMemo(
    () =>
      samples.map((sample) => {
        const x = layout.padLeft + (sample.distanceMeters / totalDistance) * graphWidth;
        const elevation = sample.elevationMeters as number;
        const y = layout.padTop + (1 - (elevation - minElevation) / ySpan) * graphHeight;
        return {
          x,
          y,
          sample
        };
      }),
    [graphHeight, graphWidth, layout.padLeft, layout.padTop, minElevation, samples, totalDistance, ySpan]
  );

  const linePath = useMemo(() => {
    if (points.length < 2) {
      return '';
    }
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length < 2) {
      return '';
    }
    const top = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
    const bottomRightX = points[points.length - 1].x.toFixed(2);
    const bottomLeftX = points[0].x.toFixed(2);
    const bottomY = (layout.padTop + graphHeight).toFixed(2);
    return `${top} L${bottomRightX},${bottomY} L${bottomLeftX},${bottomY} Z`;
  }, [graphHeight, layout.padTop, points]);

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  const updateHoverByClientX = (clientX: number) => {
    if (!svgRef.current || points.length === 0) {
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * layout.width;

    let closestIndex = 0;
    let minDiff = Number.POSITIVE_INFINITY;
    for (let index = 0; index < points.length; index += 1) {
      const diff = Math.abs(points[index].x - x);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    }

    setHoverIndex(closestIndex);
  };

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    updateHoverByClientX(event.clientX);
  };

  if (points.length < 2) {
    return <div className="text-muted">Недостаточно высотных данных в GPX для построения графика.</div>;
  }

  return (
    <div className="elevation-chart-wrap">
      <svg
        ref={svgRef}
        className="elevation-chart-svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        onTouchMove={(event) => {
          const touch = event.touches[0];
          if (!touch) {
            return;
          }
          updateHoverByClientX(touch.clientX);
        }}
      >
        <rect x={0} y={0} width={layout.width} height={layout.height} fill="#f8fbff" rx={8} />
        <line x1={layout.padLeft} y1={layout.padTop} x2={layout.padLeft} y2={layout.padTop + graphHeight} stroke="#c7d4e2" />
        <line
          x1={layout.padLeft}
          y1={layout.padTop + graphHeight}
          x2={layout.padLeft + graphWidth}
          y2={layout.padTop + graphHeight}
          stroke="#c7d4e2"
        />

        <path d={areaPath} fill="rgba(57, 156, 232, 0.35)" />
        <path d={linePath} fill="none" stroke="#228be6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {hoveredPoint && (
          <>
            <line
              x1={hoveredPoint.x}
              y1={layout.padTop}
              x2={hoveredPoint.x}
              y2={layout.padTop + graphHeight}
              stroke="rgba(34, 139, 230, 0.45)"
              strokeWidth={1}
            />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={4.5} fill="#0b73d8" stroke="#fff" strokeWidth={2} />
          </>
        )}

        <text x={layout.padLeft} y={layout.height - 8} fill="#6c757d" fontSize={13}>
          0 км
        </text>
        <text x={layout.padLeft + graphWidth} y={layout.height - 8} fill="#6c757d" fontSize={13} textAnchor="end">
          {(profile.totalDistanceMeters / 1000).toFixed(1)} км
        </text>
        <text x={6} y={layout.padTop + 12} fill="#6c757d" fontSize={12}>
          {maxElevation} м
        </text>
        <text x={6} y={layout.padTop + graphHeight - 4} fill="#6c757d" fontSize={12}>
          {minElevation} м
        </text>
      </svg>

      <div className="elevation-hover-meta">
        {hoveredPoint ? (
          <>
            <span>Высота: {formatElevationMeters(hoveredPoint.sample.elevationMeters ?? undefined)}</span>
            <span>Дистанция: {formatDistanceMeters(hoveredPoint.sample.distanceMeters)}</span>
            <span>Уклон: {formatSlope(hoveredPoint.sample.slopePercent)}</span>
            <span>Угол: {formatAngle(hoveredPoint.sample.slopeDegrees)}</span>
            <span>Время: {formatPointTime(hoveredPoint.sample.time)}</span>
          </>
        ) : (
          <span className="text-muted">Наведите на график, чтобы увидеть высоту, уклон и угол.</span>
        )}
      </div>
    </div>
  );
}
