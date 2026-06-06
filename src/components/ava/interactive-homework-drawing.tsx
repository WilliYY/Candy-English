"use client";

export type DrawingPoint = [number, number];
export type DrawingStroke = DrawingPoint[];

function clampPoint(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function midpoint(a: DrawingPoint, b: DrawingPoint): DrawingPoint {
  return [
    Math.round(((a[0] + b[0]) / 2) * 10) / 10,
    Math.round(((a[1] + b[1]) / 2) * 10) / 10,
  ];
}

export function parseInteractiveHomeworkDrawingValue(value?: string) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as { strokes?: unknown };

    if (!Array.isArray(parsed.strokes)) {
      return [];
    }

    return parsed.strokes
      .slice(0, 30)
      .map((stroke) => {
        if (!Array.isArray(stroke)) {
          return [];
        }

        return stroke
          .slice(0, 180)
          .map((point) => {
            if (
              !Array.isArray(point) ||
              typeof point[0] !== "number" ||
              typeof point[1] !== "number"
            ) {
              return null;
            }

            return [clampPoint(point[0]), clampPoint(point[1])] satisfies DrawingPoint;
          })
          .filter((point): point is DrawingPoint => Boolean(point));
      })
      .filter((stroke) => stroke.length > 0);
  } catch {
    return [];
  }
}

export function serializeInteractiveHomeworkDrawingValue(
  strokes: DrawingStroke[],
) {
  return JSON.stringify({
    strokes,
    v: 1,
  });
}

export function getInteractiveHomeworkDrawingPath(stroke: DrawingStroke) {
  if (stroke.length < 2) {
    return "";
  }

  if (stroke.length === 2) {
    return `M ${stroke[0][0]} ${stroke[0][1]} L ${stroke[1][0]} ${stroke[1][1]}`;
  }

  const [start] = stroke;
  let path = `M ${start[0]} ${start[1]}`;

  for (let index = 1; index < stroke.length - 1; index += 1) {
    const current = stroke[index];
    const next = stroke[index + 1];
    const [midX, midY] = midpoint(current, next);

    path += ` Q ${current[0]} ${current[1]} ${midX} ${midY}`;
  }

  const last = stroke[stroke.length - 1];

  path += ` L ${last[0]} ${last[1]}`;

  return path;
}

export function InteractiveHomeworkDrawingStrokes({
  className,
  strokeWidth = 2.5,
  strokes,
}: {
  className?: string;
  strokeWidth?: number;
  strokes: DrawingStroke[];
}) {
  return (
    <g className={className}>
      {strokes.map((stroke, strokeIndex) => {
        if (stroke.length === 1) {
          const [x, y] = stroke[0];

          return (
            <circle
              key={`${strokeIndex}-dot-${x}-${y}`}
              cx={x}
              cy={y}
              fill="currentColor"
              r={strokeWidth / 2}
            />
          );
        }

        return (
          <path
            key={`${strokeIndex}-${stroke.length}`}
            d={getInteractiveHomeworkDrawingPath(stroke)}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}
