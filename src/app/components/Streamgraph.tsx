/**
 * 年ごとの構成を流れで見せる。StackedYears と同じ列を受け取る。
 * 人数は中心を揺らす streamgraph（縦軸の代わりにスケールバー）、構成比は 100% の面。
 * 曲線は curveBumpX。どの境界も同じ重みで補間するので、層が交差せず、各年の値を通る。
 */

import { scaleLinear } from "d3-scale";
import {
  area,
  curveBumpX,
  stack,
  stackOffsetExpand,
  stackOffsetWiggle,
  stackOrderInsideOut,
  stackOrderNone,
  type SeriesPoint,
} from "d3-shape";
import { people, tickMan } from "../data/format.ts";
import { useWidth } from "../hooks/useWidth.ts";
import type { Column, Measure } from "./StackedYears.tsx";

export type Chart = "bars" | "stream";

export const CHARTS = [
  { value: "bars", label: "棒" },
  { value: "stream", label: "ストリーム" },
] as const;

type Row = Record<string, number>;

export function Streamgraph({
  columns,
  measure,
  highlighted,
  focused,
  onFocus,
  height = 320,
  label,
}: {
  columns: Column[];
  measure: Measure;
  highlighted: string;
  focused: number;
  onFocus: (year: number) => void;
  height?: number;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const M = { left: 46, right: 6, top: 18, bottom: 28 };
  const share = measure === "share";

  const keys = [...new Set(columns.flatMap((c) => c.segments.map((s) => s.key)))];
  const colors = new Map(columns.flatMap((c) => c.segments.map((s) => [s.key, s.color] as const)));
  const rows: Row[] = columns.map((c) => Object.fromEntries(c.segments.map((s) => [s.key, s.value])));
  const series = stack<Row>()
    .keys(keys)
    .value((d, k) => d[k] ?? 0)
    .order(share ? stackOrderNone : stackOrderInsideOut)
    .offset(share ? stackOffsetExpand : stackOffsetWiggle)(rows);

  const years = columns.map((c) => c.year);
  const x = scaleLinear()
    .domain([years[0]! - 0.5, years.at(-1)! + 0.5])
    .range([M.left, Math.max(M.left + 1, width - M.right)]);
  const step = x(1) - x(0);
  const lo = Math.min(...series.flatMap((s) => s.map((p) => p[0])));
  const hi = Math.max(...series.flatMap((s) => s.map((p) => p[1])));
  const y = scaleLinear()
    .domain(share ? [0, 1] : [lo, hi])
    .range([height - M.bottom, M.top]);
  const shape = area<SeriesPoint<Row>>()
    .x((_, i) => x(years[i]!))
    .y0((p) => y(p[0]))
    .y1((p) => y(p[1]))
    .curve(curveBumpX);

  const span = hi - lo;
  const unit = scaleLinear().domain([0, span]).ticks(4)[1] ?? span;
  const unitPx = (unit / span) * (height - M.top - M.bottom);
  const every = step < 22 ? 5 : step < 34 ? 2 : 1;
  const fi = years.indexOf(focused);
  const emphasized = (key: string) => highlighted === "" || key === highlighted;

  const nearest = (clientX: number, svg: SVGSVGElement) => {
    const yr = x.invert(clientX - svg.getBoundingClientRect().left);
    return years.reduce((a, b) => (Math.abs(b - yr) < Math.abs(a - yr) ? b : a));
  };

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          tabIndex={0}
          onClick={(ev) => onFocus(nearest(ev.clientX, ev.currentTarget))}
          onKeyDown={(ev) => {
            const move = ev.key === "ArrowLeft" ? -1 : ev.key === "ArrowRight" ? 1 : 0;
            const next = years[fi + move];
            if (move === 0 || next === undefined) return;
            ev.preventDefault();
            onFocus(next);
          }}
          className="block cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {share
            ? y.ticks(4).map((t) => (
                <g key={t} transform={`translate(0,${y(t)})`}>
                  <line x1={M.left} x2={width - M.right} className="stroke-rule" />
                  <text x={M.left - 6} dy="0.32em" textAnchor="end" className="tnum fill-faint text-[10px]">
                    {`${Math.round(t * 100)}%`}
                  </text>
                </g>
              ))
            : (
                <g transform={`translate(${M.left - 6},${height - M.bottom})`}>
                  <line y2={-unitPx} className="stroke-muted" strokeWidth={1.5} />
                  <text x={2} y={-unitPx - 6} textAnchor="end" className="tnum fill-faint text-[10px]">
                    {tickMan(unit)}
                  </text>
                </g>
              )}

          {fi >= 0 && (
            <rect
              x={x(focused) - step / 2}
              width={step}
              y={M.top - 16}
              height={height - M.top + 16 - 2}
              rx={3}
              className="fill-ink/[0.045]"
            />
          )}

          {series.map((s) => (
            <path
              key={s.key}
              d={shape(s) ?? undefined}
              fill={colors.get(s.key)}
              opacity={emphasized(s.key) ? 1 : 0.28}
              className="transition-opacity duration-150 ease-out"
            >
              <title>{fi < 0 ? s.key : `${focused}年 ${s.key} ${people(rows[fi]![s.key] ?? 0)}`}</title>
            </path>
          ))}

          {fi >= 0 && (
            <line
              x1={x(focused)}
              x2={x(focused)}
              y1={M.top - 8}
              y2={height - M.bottom}
              className="stroke-ink/50"
              pointerEvents="none"
            />
          )}

          {years.map(
            (yr) =>
              (yr % every === 0 || yr === focused) && (
                <text
                  key={yr}
                  x={x(yr)}
                  y={height - M.bottom + 16}
                  textAnchor="middle"
                  className={`tnum text-[10.5px] ${yr === focused ? "fill-ink font-semibold" : "fill-muted"}`}
                >
                  {yr}
                </text>
              ),
          )}
        </svg>
      )}
    </div>
  );
}
