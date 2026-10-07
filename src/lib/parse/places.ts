/**
 * 都道府県別の在留外国人。2012–2020年は横長の2表、2021年以降はテーブルデータ。
 */

import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { PREFECTURES } from "../data/labels.ts";
import { STATUSES, TOTAL, type Status } from "../data/sources.ts";
import { clean, statusOf } from "./table.ts";
import type { PlaceYear } from "./types.ts";

type Cell = string | number | null | undefined;

const REGIONS = new Set(["アジア", "ヨーロッパ", "アフリカ", "北米", "北アメリカ", "南米", "南アメリカ", "オセアニア"]);

function count(v: Cell, where: string): number {
  if (typeof v === "number") return v;
  const s = clean(v).replace(/,/g, "");
  if (s === "" || s === "-") return 0;
  const n = Number(s);
  if (!Number.isInteger(n)) throw new Error(`${where}: 数でない「${v}」`);
  return n;
}

function placeOf(raw: string): string | null {
  const name = clean(raw);
  if (name === "" || name === TOTAL) return null;
  return PREFECTURES.find((p) => p === name || p.replace(/[都道府県]$/, "") === name) ?? null;
}

function afterCode(label: string): string {
  return clean(label).replace(/^[\d_]+[：:]/, "");
}

function emptyPlaces(): PlaceYear["statuses"] {
  return Object.fromEntries(PREFECTURES.map((name) => [name, {}]));
}

function emptyNations(): PlaceYear["nations"] {
  return Object.fromEntries(PREFECTURES.map((name) => [name, {}]));
}

function emptyTotals(): PlaceYear["totals"] {
  return Object.fromEntries(PREFECTURES.map((name) => [name, 0]));
}

function readBook(path: string): Cell[][] {
  const wb = XLSX.read(readFileSync(path));
  const data = wb.SheetNames.find((n) => !/pvt|ピボット|目次/i.test(n)) ?? wb.SheetNames[0];
  if (data === undefined) throw new Error(`${path}: シートがない`);
  return XLSX.utils.sheet_to_json<Cell[]>(wb.Sheets[data]!, { header: 1, raw: true, defval: null });
}

function readNationWide(path: string, year: number): PlaceYear["nations"] {
  const cells = readBook(path);
  const head = cells.findIndex((r) => r.some((c) => clean(c) === TOTAL) && r.filter((c) => clean(c) !== "").length > 5);
  if (head < 0) throw new Error(`${year}: 国籍の見出しがない`);
  const labels = cells[head]!.map((c) => clean(c));
  const totalCol = labels.indexOf(TOTAL);
  if (totalCol < 0) throw new Error(`${year}: 総数の列がない`);
  const nations = emptyNations();
  for (const r of cells.slice(head + 1)) {
    const name = placeOf(clean(r[0])) ?? placeOf(clean(r[1]));
    if (name === null) continue;
    for (let c = totalCol + 1; c < labels.length; c++) {
      const nation = labels[c]!;
      if (nation === "" || REGIONS.has(nation) || nation.startsWith("うち")) continue;
      const v = r[c];
      if (v === null || clean(v) === "") continue;
      nations[name]![nation] = (nations[name]![nation] ?? 0) + count(v, `${year} ${name} ${nation}`);
    }
  }
  return nations;
}

function readStatusWide(
  path: string,
  year: number,
): {
  statuses: PlaceYear["statuses"];
  totals: PlaceYear["totals"];
  unknown: number;
  unknownStatuses: PlaceYear["unknownStatuses"];
} {
  const cells = readBook(path);
  const top = cells.findIndex((r) => r.some((c) => clean(c) === TOTAL) && r.filter((c) => clean(c) !== "").length > 8);
  const first = cells.findIndex((r, i) => i > top && (clean(r[0]) === TOTAL || placeOf(clean(r[0])) !== null || placeOf(clean(r[1])) !== null));
  if (top < 0 || first < 0) throw new Error(`${year}: 在留資格の見出しがない`);
  const above = (cells[top - 1] ?? []).filter((c) => clean(c) !== "").length > 3;
  const header = cells.slice(above ? top - 1 : top, first);
  const width = Math.max(...cells.map((r) => r.length));
  const labels = Array.from({ length: width }, (_, c) => header.map((r) => clean(r[c])).join(""));
  const totalCol = labels.indexOf(TOTAL);
  if (totalCol < 0) throw new Error(`${year}: 総数の列がない`);
  const cols = labels.flatMap((label, c) => {
    const status = statusOf(label);
    return status === null || !(STATUSES as readonly string[]).includes(status) ? [] : [{ c, status: status as Status }];
  });
  const statuses = emptyPlaces();
  const totals = emptyTotals();
  let unknown = 0;
  const unknownStatuses: PlaceYear["unknownStatuses"] = {};
  for (const r of cells.slice(first)) {
    const label = clean(r[0]) || clean(r[1]);
    const name = placeOf(clean(r[0])) ?? placeOf(clean(r[1]));
    if (r[totalCol] === null || clean(r[totalCol]) === "") continue;
    if (name === null) {
      if (label.includes("未定") || label.includes("不詳")) {
        unknown += count(r[totalCol], `${year} ${label}`);
        for (const { c, status } of cols) {
          unknownStatuses[status] = (unknownStatuses[status] ?? 0) + count(r[c], `${year} ${label} ${status}`);
        }
      }
      continue;
    }
    totals[name] = count(r[totalCol], `${year} ${name}`);
    for (const { c, status } of cols) {
      statuses[name]![status] = (statuses[name]![status] ?? 0) + count(r[c], `${year} ${name} ${status}`);
    }
  }
  return { statuses, totals, unknown, unknownStatuses };
}

function readCube(path: string, year: number): PlaceYear {
  const wb = XLSX.read(readFileSync(path));
  const sheet = wb.SheetNames.find((n) => !/pvt|ピボット/i.test(n));
  if (sheet === undefined) throw new Error(`${year}: 明細シートがない`);
  const cells = XLSX.utils.sheet_to_json<Cell[]>(wb.Sheets[sheet]!, { header: 1, raw: true, defval: null });
  const head = cells.findIndex((r) => r.some((c) => clean(c) === "都道府県") && r.some((c) => String(c ?? "").includes("在留外国人")));
  if (head < 0) throw new Error(`${year}: テーブルデータの見出しがない`);
  const h = cells[head]!.map((c) => clean(c));
  const cNation = h.findIndex((x) => x.includes("国籍"));
  const cStatus = h.findIndex((x) => x.includes("在留資格"));
  const cPlace = h.findIndex((x) => x === "都道府県");
  const cValue = h.findIndex((x) => x.includes("在留外国人"));
  if ([cNation, cStatus, cPlace, cValue].some((c) => c < 0)) throw new Error(`${year}: 列が揃わない ${h.join(",")}`);
  const statuses = emptyPlaces();
  const nations = emptyNations();
  const totals = emptyTotals();
  let unknown = 0;
  const unknownStatuses: PlaceYear["unknownStatuses"] = {};
  for (const r of cells.slice(head + 1)) {
    const placeLabel = afterCode(String(r[cPlace!] ?? ""));
    const place = placeOf(placeLabel);
    const nation = afterCode(String(r[cNation!] ?? ""));
    const statusLabel = afterCode(String(r[cStatus!] ?? ""));
    if (nation === "" || nation === TOTAL || nation === "総計" || nation.startsWith("合計")) continue;
    if (statusLabel === TOTAL || statusLabel === "総計" || /合計$/.test(statusLabel) || statusLabel.startsWith("うち")) continue;
    const rawStatus = statusOf(statusLabel);
    if (rawStatus === null) throw new Error(`${year}: 知らない在留資格「${statusLabel}」`);
    if (!(STATUSES as readonly string[]).includes(rawStatus)) continue;
    const status = rawStatus as Status;
    const v = count(r[cValue!], `${year} ${placeLabel} ${nation} ${status}`);
    if (place === null) {
      if (placeLabel.includes("未定") || placeLabel.includes("不詳")) {
        unknown += v;
        unknownStatuses[status] = (unknownStatuses[status] ?? 0) + v;
      }
      continue;
    }
    statuses[place]![status] = (statuses[place]![status] ?? 0) + v;
    nations[place]![nation] = (nations[place]![nation] ?? 0) + v;
    totals[place] = (totals[place] ?? 0) + v;
  }
  return { year, statuses, nations, totals, unknown, unknownStatuses };
}

export function readPlaceYear(args: { year: number; nationPath?: string; statusPath?: string; cubePath?: string }): PlaceYear {
  if (args.cubePath !== undefined) return readCube(args.cubePath, args.year);
  if (args.nationPath === undefined || args.statusPath === undefined) {
    throw new Error(`${args.year}: 都道府県の表が足りない`);
  }
  const nations = readNationWide(args.nationPath, args.year);
  const { statuses, totals, unknown, unknownStatuses } = readStatusWide(args.statusPath, args.year);
  for (const name of PREFECTURES) {
    if (totals[name] === 0) throw new Error(`${args.year}: ${name} の総数がない`);
  }
  return { year: args.year, statuses, nations, totals, unknown, unknownStatuses };
}
