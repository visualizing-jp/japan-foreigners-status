/**
 * data/normalized/tables.json から配信用の public/data/status.json を作る。
 *
 *   npm run data
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { StatusJson } from "../src/lib/data/cube.ts";
import { STATUSES, TOTAL } from "../src/lib/data/sources.ts";
import type { YearTable } from "../src/lib/parse/types.ts";

/** 国名の変更と表記の揺れ。同じ国を最新の表の名前に寄せる。 */
const ALIASES: Record<string, string> = {
  グルジア: "ジョージア",
  マケドニア: "北マケドニア",
  スワジランド: "エスワティニ",
  セルビア共和国: "セルビア",
  モンテネグロ共和国: "モンテネグロ",
  南スーダン: "南スーダン共和国",
  ジプチ: "ジブチ",
  カーボヴェルデ: "カーボベルデ",
  ギニア・ビサウ: "ギニアビサウ",
  セントクリストファー・ネイビス: "セントクリストファー・ネービス",
  "セントクリストファー・ネーヴィス": "セントクリストファー・ネービス",
  ユーゴースラビア: "ユーゴスラヴィア",
  ユーゴスラビア: "ユーゴスラヴィア",
};

const tables = JSON.parse(
  await readFile(resolve(import.meta.dirname, "../data/normalized/tables.json"), "utf8"),
) as YearTable[];

const nameOf = (raw: string) => ALIASES[raw] ?? raw;

// 最新の年の人数の多い順。過去にしかない国籍・地域はその後ろに、最後に現れた年の人数順で。
const lastSeen = new Map<string, { year: number; total: number }>();
for (const t of tables) for (const r of t.rows.slice(1)) lastSeen.set(nameOf(r.name), { year: t.year, total: r.total });
const names = [
  TOTAL,
  ...[...lastSeen].sort(([, a], [, b]) => b.year - a.year || b.total - a.total).map(([name]) => name),
];

const values = names.map(() => tables.map((): number[] | null => null));
tables.forEach((t, y) => {
  for (const r of t.rows) {
    const n = names.indexOf(nameOf(r.name));
    if (values[n]![y] !== null) throw new Error(`${t.year}: ${r.name} が ${names[n]} と重なる`);
    values[n]![y] = STATUSES.map((s) => r.values[s] ?? 0);
  }
});

const out: StatusJson = {
  years: tables.map((t) => t.year),
  source: tables.map((t) => t.source),
  statuses: [...STATUSES],
  names,
  values,
};

const OUT = resolve(import.meta.dirname, "../public/data/status.json");
await mkdir(resolve(OUT, ".."), { recursive: true });
const json = JSON.stringify(out);
await writeFile(OUT, `${json}\n`);
console.log(`  status.json  ${(json.length / 1024).toFixed(1)}KB  ${out.years[0]}–${out.years.at(-1)}  ${names.length - 1}か国・地域`);
