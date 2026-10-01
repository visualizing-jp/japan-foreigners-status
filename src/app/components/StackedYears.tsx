/**
 * 年ごとの積み上げ棒。国・地域の構成と、在留資格の構成の両方に使う。
 * 系列を選ぶと、それ以外を薄くし、選んだ系列の値を棒の上に出す。
 */

import { scaleBand, scaleLinear } from "d3-scale";
import { pct, people, tickMan } from "../data/format.ts";
import { useWidth } from "../hooks/useWidth.ts";

export type Measure = "count" | "share";

export interface Segment {
  key: string;
  value: number;
  color: string;
}

export interface Column {
  year: number;
  total: number;
  /** 下から積む順。 */
  segments: Segment[];
}

export function StackedYears({
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
  /** 空文字なら全系列を同じ濃さで描く。 */
  highlighted: string;
  focused: number;
  onFocus: (year: number) => void;
  height?: number;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const M = { left: 46, right: 6, top: 18, bottom: 28 };
  const x = scaleBand<number>()
    .domain(columns.map((c) => c.year))
    .range([M.left, Math.max(M.left + 1, width - M.right)])
    .paddingInner(0.25)
    .paddingOuter(0.1);
  const y = scaleLinear()
    .domain([0, measure === "share" ? 1 : Math.max(...columns.map((c) => c.total), 1)])
    .nice(4)
    .range([height - M.bottom, M.top]);
  const scale = (c: Column, v: number) => (measure === "share" ? v / c.total : v);
  const tick = (v: number) => (measure === "share" ? `${Math.round(v * 100)}%` : tickMan(v));
  const every = x.step() < 22 ? 5 : x.step() < 34 ? 2 : 1;
  const emphasized = (key: string) => highlighted === "" || key === highlighted;

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          {y.ticks(4).map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={M.left} x2={width - M.right} className="stroke-rule" />
              <text x={M.left - 6} dy="0.32em" textAnchor="end" className="tnum fill-faint text-[10px]">
                {tick(t)}
              </text>
            </g>
          ))}

          {columns.map((c) => {
            const x0 = x(c.year)!;
            const bw = x.bandwidth();
            const cx = x0 + bw / 2;
            const isFocused = c.year === focused;
            let acc = 0;
            const stacks = c.segments.map((s) => {
              const bottom = y(acc);
              acc += scale(c, s.value);
              return { s, top: y(acc), bottom };
            });
            const pick = stacks.find((st) => st.s.key === highlighted);
            const hit = Math.max(x.step(), 18);
            return (
              <g
                key={c.year}
                role="button"
                tabIndex={0}
                aria-pressed={isFocused}
                aria-label={`${c.year}年`}
                onClick={() => onFocus(c.year)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onFocus(c.year);
                  }
                }}
                className="group cursor-pointer outline-none"
              >
                <rect
                  x={cx - hit / 2}
                  width={hit}
                  y={M.top - 16}
                  height={height - M.top + 16 - 2}
                  rx={3}
                  className={`group-focus-visible:stroke-ink group-focus-visible:stroke-2 ${
                    isFocused ? "fill-ink/[0.045]" : "fill-transparent hover:fill-ink/[0.025]"
                  }`}
                />
                {stacks.map(({ s, top, bottom }) => (
                  <rect
                    key={s.key}
                    x={x0}
                    width={bw}
                    y={top}
                    height={Math.max(0, bottom - top - 0.5)}
                    fill={s.color}
                    opacity={emphasized(s.key) ? 1 : 0.28}
                    className="transition-opacity duration-150 ease-out"
                  >
                    <title>{`${c.year}年 ${s.key} ${people(s.value)}（${pct(s.value / c.total)}）`}</title>
                  </rect>
                ))}
                {pick !== undefined && bw >= 14 && (
                  <text x={cx} y={pick.top - 4} textAnchor="middle" className="tnum fill-ink text-[9.5px] font-semibold">
                    {measure === "share" ? `${Math.round((pick.s.value / c.total) * 100)}` : Math.round(pick.s.value / 10_000)}
                  </text>
                )}
                {(c.year % every === 0 || isFocused) && (
                  <text
                    x={cx}
                    y={height - M.bottom + 16}
                    textAnchor="middle"
                    className={`tnum text-[10.5px] ${isFocused ? "fill-ink font-semibold" : "fill-muted"}`}
                  >
                    {c.year}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
