/**
 * 時代ビュー。在留資格のまとまりの構成を年ごとに積み上げ、選んだ年の内訳を下に並べる。
 */

import { use, useMemo } from "react";
import { GROUPS } from "../../lib/data/groups.ts";
import { loadStatus } from "../data/load.ts";
import { GROUP_COLORS } from "../data/colors.ts";
import { firstOf, lastOf, valueOf } from "../data/derive.ts";
import { change, exact, pct } from "../data/format.ts";
import { Segmented } from "../components/Segmented.tsx";
import { StackedYears, type Column, type Measure } from "../components/StackedYears.tsx";
import { CHARTS, Streamgraph, type Chart } from "../components/Streamgraph.tsx";
import { Preliminary } from "../components/Preliminary.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const MEASURES = [
  { value: "count", label: "人数" },
  { value: "share", label: "構成比" },
] as const;

export function EraView() {
  const d = use(loadStatus());
  const last = d.years.at(-1)!;
  const [yearParam, setYearParam] = useUrlState<string>("y", String(last), (v) => d.years.includes(Number(v)));
  const year = Number(yearParam);
  const yi = d.years.indexOf(year);
  const [measure, setMeasure] = useUrlState<Measure>("measure", "count", (v) => v === "count" || v === "share");
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const [picked, setPicked] = useUrlState<string>("g", "", (v) => GROUPS.some((g) => g.name === v));
  const Years = chart === "stream" ? Streamgraph : StackedYears;

  const columns = useMemo(
    (): Column[] =>
      d.years.map((yr, k) => ({
        year: yr,
        total: valueOf(d, 0, k)!,
        segments: GROUPS.map((g) => ({ key: g.name, value: valueOf(d, 0, k, g.name)!, color: GROUP_COLORS[g.name]! })),
      })),
    [d],
  );

  const total = valueOf(d, 0, yi)!;
  const prev = yi > 0 ? valueOf(d, 0, yi - 1) : null;
  const reference = d.source[yi] === "registry";
  const firstResident = d.years[d.source.indexOf("resident")]!;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-[19px] font-semibold tracking-tight">在留資格のまとまり別の在留外国人数</h1>
        <div className="flex gap-2">
          <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
          <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
        </div>
      </header>

      <p className="tnum min-h-9 pb-3 text-[12.5px]">
        <span className="font-semibold">{year}年末</span>
        {reference && <Preliminary label="参考値" />}
        <span className="text-muted">{` · 総数 ${exact(total)}`}</span>
        {prev !== null && <span className="text-muted">{`（前年末比 ${change(total, prev)}）`}</span>}
      </p>

      <Years
        columns={columns}
        measure={measure}
        highlighted={picked}
        focused={year}
        onFocus={(y) => setYearParam(String(y))}
        label={`在留資格のまとまり別の在留外国人数の${measure === "share" ? "構成比" : "人数"}`}
      />

      <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-4 gap-y-0.5 pl-[46px]">
        {GROUPS.map((g) => {
          const v = valueOf(d, 0, yi, g.name)!;
          const on = picked === g.name;
          return (
            <li key={g.name}>
              <button
                type="button"
                onClick={() => setPicked(on ? "" : g.name)}
                aria-pressed={on}
                className={`tnum flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-[12px] transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] ${
                  on ? "bg-ink/[0.06]" : "hover:bg-ink/[0.03]"
                }`}
              >
                <span aria-hidden className="size-[9px] shrink-0 rounded-[2px]" style={{ backgroundColor: GROUP_COLORS[g.name] }} />
                <span className={`min-w-0 flex-1 truncate ${on ? "font-semibold text-ink" : "text-muted"}`}>{g.name}</span>
                <span className="text-[11px] text-faint">{exact(v)}</span>
                <span className={`w-11 text-right text-[11px] ${on ? "text-ink" : "text-muted"}`}>{pct(v / total)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
        <li>
          在留外国人は、中長期在留者と特別永住者。{firstResident - 1}年末までは外国人登録者のうち、いまの在留外国人に当たる在留資格の人数（出入国在留管理庁の推移表と同じ数え方）で、参考値。「短期滞在」「未取得者」「一時庇護」「その他」を除いていて、在留期間が3月以下の人を含む。
        </li>
        <li>
          まとまりは、出入国在留管理庁が「専門的・技術的分野での就労を目的とする在留資格」とする範囲から「特定技能」を分けたもの。内訳は「在留資格」を参照。
        </li>
        <li>
          表に初めて現れる年は、「技能実習」が{firstOf(d, "技能実習")}年末、「特定技能」が{firstOf(d, "特定技能")}年末。「就学」は{lastOf(d, "就学")}年末の表まで。
        </li>
        <li>まとまりを押すと、グラフでそのまとまりだけを濃くする。</li>
      </ul>
    </div>
  );
}