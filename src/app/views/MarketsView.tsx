/**
 * 国・地域ビュー。年を選ぶと国籍・地域の順位、時系列では上位の構成、下に選んだ国の在留資格の構成。
 *
 * 上位の構成は韓国と朝鮮が分かれた年から描く（それまでは「韓国・朝鮮」、2011年末までは台湾も「中国」に含む）。
 * 選んだ国の在留資格の構成は、その名前が表にある年をすべて描く。
 */

import { use, useMemo } from "react";
import { GROUPS } from "../../lib/data/groups.ts";
import { loadStatus } from "../data/load.ts";
import { GROUP_COLORS, PICK_COLOR, RANK_COLORS, REST_COLOR } from "../data/colors.ts";
import { nationSince, valueOf } from "../data/derive.ts";
import { exact, pct, people } from "../data/format.ts";
import { RankList, type RankRow } from "../components/RankList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { StackedYears, type Column, type Measure } from "../components/StackedYears.tsx";
import { CHARTS, Streamgraph, type Chart } from "../components/Streamgraph.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { Preliminary } from "../components/Preliminary.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";
import type { StatusJson } from "../../lib/data/cube.ts";

const MEASURES = [
  { value: "count", label: "人数" },
  { value: "share", label: "構成比" },
] as const;

const TOP = RANK_COLORS.length;
const REST = "そのほか";

/** その年に表にある国籍・地域を多い順に。 */
function ranking(d: StatusJson, y: number): { name: string; value: number }[] {
  return d.names
    .flatMap((name, n) => {
      const v = n === 0 ? null : valueOf(d, n, y);
      return v === null ? [] : [{ name, value: v }];
    })
    .sort((a, b) => b.value - a.value);
}

export function MarketsView() {
  const d = use(loadStatus());
  const last = d.years.at(-1)!;
  const since = nationSince(d);

  const [yearParam, setYearParam] = useUrlState<string>("y", String(last), (v) => d.years.includes(Number(v)));
  const year = Number(yearParam);
  const yi = d.years.indexOf(year);
  const [measure, setMeasure] = useUrlState<Measure>("measure", "count", (v) => v === "count" || v === "share");
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const [selected, setPicked] = useUrlState<string>("m", "", (v) => d.names.includes(v) && v !== d.names[0]);
  const Years = chart === "stream" ? Streamgraph : StackedYears;

  const top = useMemo(() => ranking(d, d.years.length - 1).slice(0, TOP).map((r) => r.name), [d]);
  const colorOf = (name: string) => {
    const k = top.indexOf(name);
    return k < 0 ? undefined : RANK_COLORS[k];
  };

  const total = valueOf(d, 0, yi)!;
  const rows: RankRow[] = ranking(d, yi).map((r) => ({
    name: r.name,
    value: r.value,
    label: pct(r.value / total),
    indent: 0,
    color: colorOf(r.name),
  }));

  const pickIndex = d.names.indexOf(selected);
  const extra =
    pickIndex > 0 && !top.includes(selected) && d.values[pickIndex]!.some((v, k) => v !== null && d.years[k]! >= since)
      ? selected
      : null;
  const columns = useMemo((): Column[] => {
    const shownNames = extra === null ? top : [...top, extra];
    return d.years.flatMap((yr, k) => {
      if (yr < since) return [];
      const t = valueOf(d, 0, k)!;
      const shown = shownNames.map((name) => ({
        key: name,
        value: valueOf(d, d.names.indexOf(name), k) ?? 0,
        color: colorOf(name) ?? PICK_COLOR,
      }));
      const rest = t - shown.reduce((a, s) => a + s.value, 0);
      return [{ year: yr, total: t, segments: [...shown, { key: REST, value: rest, color: REST_COLOR }] }];
    });
  }, [d, since, top, extra]);

  const focus = pickIndex < 0 ? 0 : pickIndex;
  const focusName = d.names[focus]!;
  const groupColumns = useMemo(
    (): Column[] =>
      d.years.flatMap((yr, k) => {
        const t = valueOf(d, focus, k);
        if (t === null) return [];
        return [
          {
            year: yr,
            total: t,
            segments: GROUPS.map((g) => ({ key: g.name, value: valueOf(d, focus, k, g.name)!, color: GROUP_COLORS[g.name]! })),
          },
        ];
      }),
    [d, focus],
  );

  const pickedValue = pickIndex < 0 ? null : valueOf(d, pickIndex, yi);
  const reference = d.source[yi] === "registry";
  const firstResident = d.years[d.source.indexOf("resident")]!;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <YearSelect years={d.years} value={year} onChange={(y) => setYearParam(String(y))} format={(y) => `${y}年末`} />
          <span className="text-[11px] text-faint">総数に占める割合</span>
        </div>
        <RankList
          rows={rows}
          selected={selected}
          onSelect={(name) => setPicked(name === selected ? "" : name)}
          noneLabel="総数"
          noneValue={people(total)}
        />
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          国・地域を選ぶとグラフでその国だけを濃くし、下にその国の在留資格の構成を出す。同じ国をもう一度押すか「総数」で解除。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h1 className="text-[19px] font-semibold tracking-tight">国籍・地域別の在留外国人数</h1>
          <div className="flex gap-2">
            <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
            <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
          </div>
        </header>

        <p className="tnum min-h-9 pb-3 text-[12.5px]">
          <span className="font-semibold">{year}年末</span>
          {reference && <Preliminary label="参考値" />}
          <span className="text-muted">{` · 総数 ${people(total)}`}</span>
          {pickedValue !== null && (
            <>
              <span className="text-muted"> · </span>
              <span
                aria-hidden
                className="mr-1 inline-block size-[9px] rounded-[2px] align-baseline"
                style={{ backgroundColor: colorOf(selected) ?? PICK_COLOR }}
              />
              <span className="font-semibold">{selected}</span>
              <span className="text-muted">{` ${exact(pickedValue)}（${pct(pickedValue / total)}）`}</span>
            </>
          )}
          {selected !== "" && pickedValue === null && (
            <span className="text-muted">{` · ${selected}はこの年の表に行がない`}</span>
          )}
          {selected !== "" && (
            <button
              type="button"
              onClick={() => setPicked("")}
              className="ml-2 cursor-pointer rounded border border-rule px-1.5 py-px text-[11px] text-muted transition-[color,border-color,transform] duration-150 ease-out hover:border-rule-strong hover:text-ink active:scale-[0.97]"
            >
              解除
            </button>
          )}
        </p>

        <Years
          columns={columns}
          measure={measure}
          highlighted={top.includes(selected) ? selected : (extra ?? "")}
          focused={year}
          onFocus={(y) => setYearParam(String(y))}
          label={`国籍・地域別の在留外国人数の${measure === "share" ? "構成比" : "人数"}`}
        />
        <Legend
          items={[
            ...top.map((name, k) => ({ name, color: RANK_COLORS[k]! })),
            ...(extra === null ? [] : [{ name: extra, color: PICK_COLOR }]),
            { name: REST, color: REST_COLOR },
          ]}
        />

        <section className="mt-8">
          <h2 className="pb-2 text-[13px] font-semibold">{focusName}の在留資格の構成</h2>
          <Years
            columns={groupColumns}
            measure="share"
            highlighted=""
            focused={year}
            onFocus={(y) => setYearParam(String(y))}
            height={240}
            label={`${focusName}の在留資格のまとまり別の構成比`}
          />
          <Legend items={GROUPS.map((g) => ({ name: g.name, color: GROUP_COLORS[g.name]! }))} />
        </section>

        <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          <li>
            色のついた{TOP}か国・地域は{last}年末の上位。「{REST}」は総数からそれらを引いた残り。積み上げは、韓国と朝鮮が別の行になった{since}年末から。
          </li>
          <li>
            {since - 1}年末までの表は「韓国・朝鮮」を1行にしている。{firstResident - 1}年末までの表では、台湾は「中国」に含まれる。
          </li>
          <li>
            国名が変わった国（グルジア→ジョージアなど）と表記の揺れは、最新の表の名前にそろえている。{firstResident - 1}年末までは参考値（「時代」の注を参照）。
          </li>
        </ul>
      </main>
    </div>
  );
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-[46px] text-[11px] text-muted">
      {items.map((it) => (
        <li key={it.name} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-[9px] rounded-[2px]" style={{ backgroundColor: it.color }} />
          {it.name}
        </li>
      ))}
    </ul>
  );
}
