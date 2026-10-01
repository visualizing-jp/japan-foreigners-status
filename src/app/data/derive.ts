/**
 * 配信データから人数を引く。key はまとまり（groups.ts）の名前か、在留資格の名前。
 */

import type { StatusJson } from "../../lib/data/cube.ts";
import { GROUPS } from "../../lib/data/groups.ts";
import type { Status } from "../../lib/data/sources.ts";

export function statusesOf(key: string): Status[] {
  return GROUPS.find((g) => g.name === key)?.statuses ?? [key as Status];
}

export function groupOf(status: Status): string {
  return GROUPS.find((g) => g.statuses.includes(status))!.name;
}

/** n 行目・y 列目の人数。key を省くと全在留資格の和。その年の表に行がなければ null。 */
export function valueOf(d: StatusJson, n: number, y: number, key?: string): number | null {
  const row = d.values[n]?.[y];
  if (row == null) return null;
  if (key === undefined) return row.reduce((a, b) => a + b, 0);
  return statusesOf(key).reduce((a, s) => a + row[d.statuses.indexOf(s)]!, 0);
}

/** その在留資格（かまとまり）が総数の行に初めて・最後に現れた年。 */
export function firstOf(d: StatusJson, key: string): number | undefined {
  return d.years.find((_, k) => valueOf(d, 0, k, key)! > 0);
}

export function lastOf(d: StatusJson, key: string): number | undefined {
  return d.years.findLast((_, k) => valueOf(d, 0, k, key)! > 0);
}

/** 国籍・地域の推移を描く最初の年。韓国と朝鮮が分かれた年（それまでは「韓国・朝鮮」）。 */
export function nationSince(d: StatusJson): number {
  return d.years[Math.min(...["韓国", "朝鮮"].map((name) => d.values[d.names.indexOf(name)]!.findIndex((v) => v !== null)))]!;
}
