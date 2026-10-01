/**
 * 各年末の第1表を読む。形式は2つ。
 *
 * - 横長（2022年6月末まで）: 行が国籍・地域、列が在留資格。見出しは2〜3行にまたがり、年によって段がずれる。
 *   列ごとに見出しの文字を上からつなげ、名前の一覧と照らして在留資格の列を決める。
 *   「特定活動」「日本人の配偶者等」「短期滞在」は内訳の列を持つので「計」の列だけを取る。
 * - 縦長（2022年12月末から）: 1行が「州・国籍・地域・在留資格・人数」。
 *
 * 号のある資格は号の行・列を足す。州の小計と「うち◯◯」の内数は読まない。
 * 読んだ値が合っているかは verify で確かめる（在留資格の和が総数に一致するか）。
 */

import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { EXCLUDED, STATUSES, TOTAL, type Excluded, type Source, type Status } from "../data/sources.ts";
import type { NationRow, YearTable } from "./types.ts";

/** 行の長さを超えた列は undefined。 */
type Cell = string | number | null | undefined;

const REGIONS = new Set(["アジア", "ヨーロッパ", "アフリカ", "北米", "北アメリカ", "南米", "南アメリカ", "オセアニア"]);
const STATELESS = "無国籍";

export function clean(s: Cell): string {
  return String(s ?? "")
    .replace(/\s/g, "")
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

/** 表の在留資格名を揃えた名前に。号の行・列は資格に寄せる。対象外は null。 */
export function statusOf(label: string): Status | Excluded | null {
  if (/^高度専門職\d号[イロハ]?$/.test(label)) return "高度専門職";
  if (/^特定技能\d号$/.test(label)) return "特定技能";
  if (/^技能実習\d号[イロ]$/.test(label)) return "技能実習";
  if (label === "投資・経営") return "経営・管理";
  if (label === "技術" || label === "人文知識・国際業務") return "技術・人文知識・国際業務";
  if (label === "短期計") return "短期滞在";
  if (label === "特定活動計") return "特定活動";
  if (label === "日本人の配偶者等計") return "日本人の配偶者等";
  if ((STATUSES as readonly string[]).includes(label)) return label as Status;
  if ((EXCLUDED as readonly string[]).includes(label)) return label as Excluded;
  return null;
}

function count(v: Cell, where: string): number {
  if (typeof v === "number") return v;
  const s = clean(v).replace(/,/g, "");
  if (s === "" || s === "-") return 0;
  const n = Number(s);
  if (!Number.isInteger(n)) throw new Error(`${where}: 数でない「${v}」`);
  return n;
}

function add(row: NationRow, status: Status | Excluded, v: number): void {
  row.values[status] = (row.values[status] ?? 0) + v;
}

function readWide(cells: Cell[][], year: number, source: Source): NationRow[] {
  const top = cells.findIndex((r) => r.some((c) => clean(c) === TOTAL) && r.filter((c) => clean(c) !== "").length > 10);
  const first = cells.findIndex((r, i) => i > top && clean(r[0]) === TOTAL);
  if (top < 0 || first < 0) throw new Error(`${year}: 見出しと総数の行が見つからない`);
  // 2020年末の表は、在留資格名が「総数」の行と、その1つ上の行に分かれている。
  const above = (cells[top - 1] ?? []).filter((c) => clean(c) !== "").length > 3;
  const header = cells.slice(above ? top - 1 : top, first);
  const width = Math.max(...cells.map((r) => r.length));
  const labels = Array.from({ length: width }, (_, c) => header.map((r) => clean(r[c])).join(""));

  const totalCol = labels.indexOf(TOTAL);
  // 外国人登録者の表では、末尾の「その他」が在留資格の区分。特定活動・短期滞在の内訳にも「その他」がある。
  const otherCol = source === "registry" ? labels.lastIndexOf("その他") : -1;
  const cols = labels.flatMap((label, c) => {
    const status = label === "その他" ? (c === otherCol ? "その他" : null) : statusOf(label);
    return status === null ? [] : [{ c, status }];
  });
  const seen = new Set(cols.map((x) => x.status));
  const missing = [...STATUSES, ...(source === "registry" ? EXCLUDED : [])].filter((s) => !seen.has(s));
  if (totalCol < 0) throw new Error(`${year}: 総数の列がない`);

  const rows: NationRow[] = [];
  for (const r of cells.slice(first)) {
    // 2019年末からは国籍・地域名が1列目だけにあり、2列目が総数。それまでは州が1列目、国籍・地域が2列目。
    const name = (totalCol === 1 ? "" : clean(r[1])) || clean(r[0]);
    if (name === "" || name.startsWith("うち") || REGIONS.has(name)) continue;
    if (r[totalCol] === null || clean(r[totalCol]) === "") continue;
    const row: NationRow = { name, total: count(r[totalCol], `${year} ${name}`), values: {} };
    for (const { c, status } of cols) add(row, status, count(r[c], `${year} ${name} ${labels[c]}`));
    rows.push(row);
  }
  console.log(`  ${year}: 横長 ${rows.length}行 / 表にない在留資格: ${missing.join("・") || "なし"}`);
  return rows;
}

function readLong(cells: Cell[][], year: number): NationRow[] {
  const head = cells.findIndex((r) => clean(r[0]) === "時点");
  if (head < 0) throw new Error(`${year}: 見出し「時点」がない`);
  const h = cells[head]!.map(clean);
  const [cRegion, cName, cStatus, cPurpose, cValue] = ["州", "国籍・地域", "在留資格", "在留目的", "在留外国人数"].map((k) =>
    h.indexOf(k),
  );
  if ([cRegion, cName, cStatus, cValue].some((c) => c! < 0)) throw new Error(`${year}: 列が揃わない ${h.join(",")}`);

  const byName = new Map<string, NationRow>();
  for (const r of cells.slice(head + 1)) {
    const region = clean(r[cRegion!]);
    let name = clean(r[cName!]);
    const status = clean(r[cStatus!]);
    if (cPurpose! >= 0 && clean(r[cPurpose!]) !== "計") continue;
    // 州の小計は国籍・地域が「総数」。2023年末のオセアニアだけは州名が入っている。
    if (name.startsWith("うち") || REGIONS.has(name)) continue;
    if (name === TOTAL && region !== TOTAL) {
      if (region !== STATELESS) continue;
      name = STATELESS;
    }
    const row = byName.get(name) ?? { name, total: 0, values: {} };
    byName.set(name, row);
    const v = count(r[cValue!], `${year} ${name} ${status}`);
    if (status === TOTAL) row.total = v;
    else if (!/合計$/.test(status)) {
      const s = statusOf(status);
      if (s === null) throw new Error(`${year}: 知らない在留資格「${status}」`);
      add(row, s, v);
    }
  }
  const rows = [...byName.values()];
  console.log(`  ${year}: 縦長 ${rows.length}行`);
  return rows;
}

export function readTable(path: string, year: number, source: Source): YearTable {
  const wb = XLSX.read(readFileSync(path));
  if (wb.SheetNames.length !== 1) throw new Error(`${year}: シートが ${wb.SheetNames.length} 枚`);
  const cells = XLSX.utils.sheet_to_json<Cell[]>(wb.Sheets[wb.SheetNames[0]!]!, { header: 1, raw: true, defval: null });
  const long = cells.some((r) => clean(r[0]) === "時点");
  const rows = long ? readLong(cells, year) : readWide(cells, year, source);
  if (rows[0]?.name !== TOTAL) throw new Error(`${year}: 先頭が総数でない（${rows[0]?.name}）`);
  return { year, source, rows };
}
