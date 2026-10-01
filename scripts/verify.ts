/**
 * 正規化した表の検算。
 *
 * - 各行: 在留資格（外国人登録者は除く区分も含む）の和が「総数」列に一致する
 * - 各在留資格: 国籍・地域の行の和が「総数」の行に一致する
 * - 国籍・地域名が年の中で重複しない
 * - 2011年末まで: 除く区分を引いた数が、出入国在留管理庁の推移表の値に一致する
 *
 *   npm run verify
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { EXCLUDED, STATUSES } from "../src/lib/data/sources.ts";
import type { YearTable } from "../src/lib/parse/types.ts";

/**
 * 出入国在留管理庁「令和7年末現在における在留外国人数について」第1表。
 * 平成23年末までは「外国人登録者数のうち中長期在留者に該当し得る在留資格をもって在留する者及び特別永住者の数」。
 */
export const ISA_REFERENCE: Record<number, number> = {
  2006: 1_989_864,
  2007: 2_069_065,
  2008: 2_144_682,
  2009: 2_125_571,
  2010: 2_087_261,
  2011: 2_047_349,
};

const tables = JSON.parse(
  await readFile(resolve(import.meta.dirname, "../data/normalized/tables.json"), "utf8"),
) as YearTable[];

const keys = [...STATUSES, ...EXCLUDED];
const errors: string[] = [];
let checks = 0;
const expect = (ok: boolean, message: string) => {
  checks++;
  if (!ok) errors.push(message);
};

for (const t of tables) {
  const [total, ...nations] = t.rows;
  expect(new Set(t.rows.map((r) => r.name)).size === t.rows.length, `${t.year}: 国籍・地域名が重複`);
  for (const r of t.rows) {
    const sum = keys.reduce((a, k) => a + (r.values[k] ?? 0), 0);
    expect(sum === r.total, `${t.year} ${r.name}: 在留資格の和 ${sum} ≠ 総数 ${r.total}`);
  }
  for (const k of ["total" as const, ...keys]) {
    const of = (r: (typeof t.rows)[number]) => (k === "total" ? r.total : (r.values[k] ?? 0));
    const sum = nations.reduce((a, r) => a + of(r), 0);
    expect(sum === of(total!), `${t.year} ${k}: 国籍・地域の和 ${sum} ≠ 総数の行 ${of(total!)}`);
  }
  if (t.source === "registry") {
    const resident = total!.total - EXCLUDED.reduce((a, k) => a + (total!.values[k] ?? 0), 0);
    expect(resident === ISA_REFERENCE[t.year], `${t.year}: 除く区分を引いた数 ${resident} ≠ 推移表 ${ISA_REFERENCE[t.year]}`);
  } else {
    expect(EXCLUDED.every((k) => total!.values[k] === undefined), `${t.year}: 在留外国人の表に除く区分がある`);
  }
}

const years = tables.map((t) => t.year);
expect(years.every((y, i) => i === 0 || y === years[i - 1]! + 1), `年が連続しない: ${years.join(",")}`);

if (errors.length > 0) {
  console.error(errors.join("\n"));
  console.error(`  ✗ ${errors.length} / ${checks} 件が不一致`);
  process.exit(1);
}
console.log(`  ✓ ${checks} 件の検算がすべて一致`);
