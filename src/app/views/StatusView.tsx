/**
 * 在留資格ビュー。在留資格（かまとまり）を選ぶと、その人数の推移と、国籍・地域の構成の推移。
 *
 * 一覧はまとまりを見出しに、在留資格を字下げして並べる。在留資格が1つだけのまとまりは1行にする。
 * 国籍・地域の構成は、国・地域ビューと同じく韓国と朝鮮が分かれた年から描く。
 */

import { use, useMemo } from "react";
import type { StatusJson } from "../../lib/data/cube.ts";
import { GROUPS } from "../../lib/data/groups.ts";
import { loadStatus } from "../data/load.ts";
import { GROUP_COLORS, RANK_COLORS, REST_COLOR } from "../data/colors.ts";
import { firstOf, groupOf, lastOf, nationSince, statusesOf, valueOf } from "../data/derive.ts";
import { change, exact, pct } from "../data/format.ts";
import { RankList, type RankRow } from "../components/RankList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { StackedYears, type Column, type Measure } from "../components/StackedYears.tsx";
import { CHARTS, Streamgraph, type Chart } from "../components/Streamgraph.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { Preliminary } from "../components/Preliminary.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";
import type { Status } from "../../lib/data/sources.ts";

const MEASURES = [
  { value: "count", label: "人数" },
  { value: "share", label: "構成比" },
] as const;

const TOP = RANK_COLORS.length;
const REST = "そのほか";

/** 表の見出しが変わった在留資格。名前は2014年末と2015年末の表の見出しによる。 */
const RENAMED: Partial<Record<Status, string>> = {
  "経営・管理": "2014年末までの表では「投資・経営」。",
  "技術・人文知識・国際業務": "2014年末までの表では「技術」と「人文知識・国際業務」の2つで、ここでは合算している。",
};

function listRows(d: StatusJson, y: number, total: number): RankRow[] {
  const row = (name: string, indent: number, color?: string): RankRow[] => {
    const v = valueOf(d, 0, y, name)!;
    return v === 0 ? [] : [{ name, value: v, label: pct(v / total), indent, color }];
  };
  return GROUPS.flatMap((g) =>
    g.statuses.length === 1
      ? row(g.statuses[0]!, 0, GROUP_COLORS[g.name])
      : [...row(g.name, 0, GROUP_COLORS[g.name]), ...g.statuses.flatMap((s) => row(s, 1))],
  );
}

export function StatusView() {
  const d = use(loadStatus());
  const last = d.years.length - 1;
  const since = nationSince(d);
  const keys = [...GROUPS.map((g) => g.name), ...d.statuses];
  const largest = d.statuses.reduce((a, s) => (valueOf(d, 0, last, s)! > valueOf(d, 0, last, a)! ? s : a));

  const [yearParam, setYearParam] = useUrlState<string>("y", String(d.years[last]), (v) => d.years.includes(Number(v)));
  const year = Number(yearParam);
  const yi = d.years.indexOf(year);
  const [key, setKey] = useUrlState<string>("s", largest, (v) => keys.includes(v));
  const [measure, setMeasure] = useUrlState<Measure>("measure", "count", (v) => v === "count" || v === "share");
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const [picked, setPicked] = useUrlState<string>("m", "", (v) => d.names.includes(v) && v !== d.names[0]);
  const Years = chart === "stream" ? Streamgraph : StackedYears;

  const statuses = statusesOf(key);
  const color = GROUP_COLORS[GROUPS.some((g) => g.name === key) ? key : groupOf(key as Status)]!;
  const total = valueOf(d, 0, yi)!;
  const rows = listRows(d, yi, total);

  const trend = useMemo(
    (): Column[] =>
      d.years.map((yr, k) => {
        const v = valueOf(d, 0, k, key)!;
        return { year: yr, total: v, segments: [{ key, value: v, color }] };
      }),
    [d, key, color],
  );

  const top = useMemo(
    () =>
      d.names
        .map((name, n) => ({ name, v: n === 0 ? null : valueOf(d, n, last, key) }))
        .filter((r): r is { name: string; v: number } => r.v !== null && r.v > 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, TOP)
        .map((r) => r.name),
    [d, last, key],
  );
  const nations = useMemo((): Column[] => {
    return d.years.flatMap((yr, k) => {
      const t = valueOf(d, 0, k, key)!;
      if (yr < since || t === 0) return [];
      const shown = top.map((name, r) => ({
        key: name,
        value: valueOf(d, d.names.indexOf(name), k, key) ?? 0,
        color: RANK_COLORS[r]!,
      }));
      const rest = t - shown.reduce((a, s) => a + s.value, 0);
      return [{ year: yr, total: t, segments: [...shown, { key: REST, value: rest, color: REST_COLOR }] }];
    });
  }, [d, since, top, key]);

  const value = valueOf(d, 0, yi, key)!;
  const prev = yi > 0 ? valueOf(d, 0, yi - 1, key)! : 0;
  const reference = d.source[yi] === "registry";
  const first = firstOf(d, key);
  const lastYear = lastOf(d, key);
  const notes = [
    ...statuses.flatMap((s) => (RENAMED[s] === undefined ? [] : [`「${s}」は${RENAMED[s]}`])),
    first !== undefined && first > d.years[0]! ? `「${key}」は${first}年末の表から。` : null,
    lastYear !== undefined && lastYear < d.years[last]! ? `「${key}」は${lastYear}年末の表まで。` : null,
    statuses.length > 1 ? `「${key}」は${statuses.map((s) => `「${s}」`).join("")}の合計。` : null,
  ].filter((s): s is string => s !== null);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <YearSelect years={d.years} value={year} onChange={(y) => setYearParam(String(y))} format={(y) => `${y}年末`} />
          <span className="text-[11px] text-faint">総数に占める割合</span>
        </div>
        <RankList
          rows={rows}
          selected={key}
          onSelect={(k) => {
            setKey(k);
            setPicked("");
          }}
        />
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          在留資格かまとまりを選ぶと、その人数の推移と国籍・地域の構成を出す。その年に人数のない在留資格は一覧に出ない。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="pb-4">
          <h1 className="text-[19px] font-semibold tracking-tight">「{key}」の在留外国人数</h1>
        </header>

        <p className="tnum min-h-9 pb-3 text-[12.5px]">
          <span className="font-semibold">{year}年末</span>
          {reference && <Preliminary label="参考値" />}
          <span className="text-muted"> · </span>
          <span aria-hidden className="mr-1 inline-block size-[9px] rounded-[2px] align-baseline" style={{ backgroundColor: color }} />
          <span className="font-semibold">{key}</span>
          <span className="text-muted">
            {value > 0 ? ` ${exact(value)}（総数の${pct(value / total)}）` : " この年末の表にはない"}
          </span>
          {prev > 0 && <span className="text-muted">{` · 前年末比 ${change(value, prev)}`}</span>}
        </p>

        <StackedYears
          columns={trend}
          measure="count"
          highlighted=""
          focused={year}
          onFocus={(y) => setYearParam(String(y))}
          height={220}
          label={`「${key}」の在留外国人数の推移`}
        />

        <section className="mt-8">
          <header className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <h2 className="text-[13px] font-semibold">「{key}」の国籍・地域</h2>
            <div className="flex gap-2">
              <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
              <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
            </div>
          </header>
          {nations.length > 0 && (
            <Years
              columns={nations}
              measure={measure}
              highlighted={top.includes(picked) ? picked : ""}
              focused={year}
              onFocus={(y) => setYearParam(String(y))}
              label={`「${key}」の国籍・地域別の${measure === "share" ? "構成比" : "人数"}`}
            />
          )}
          <ul className="mt-2 flex flex-wrap gap-x-1 gap-y-1 pl-[46px] text-[11px]">
            {[...top, REST].map((name) => {
              const on = picked === name;
              const nameColor = name === REST ? REST_COLOR : RANK_COLORS[top.indexOf(name)]!;
              return (
                <li key={name}>
                  <button
                    type="button"
                    disabled={name === REST}
                    onClick={() => setPicked(on ? "" : name)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-[background-color,transform] duration-150 ease-out enabled:cursor-pointer enabled:active:scale-[0.97] ${
                      on ? "bg-ink/[0.06] font-semibold text-ink" : "text-muted enabled:hover:bg-ink/[0.03]"
                    }`}
                  >
                    <span aria-hidden className="size-[9px] rounded-[2px]" style={{ backgroundColor: nameColor }} />
                    {name}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
          <li>
            色のついた{TOP}か国・地域は{d.years[last]}年末にこの在留資格で多い順。国籍・地域の構成は、韓国と朝鮮が別の行になった{since}年末から（「国・地域」の注を参照）。凡例の国を押すとその国だけを濃くする。
          </li>
          <li>{d.years[d.source.indexOf("resident")]! - 1}年末までは参考値（「時代」の注を参照）。</li>
        </ul>
      </main>
    </div>
  );
}
