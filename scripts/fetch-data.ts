/**
 * sources.ts の各年末の表を data/raw/{year}.xlsx に落とす（2011年末までは .xls）。
 * 既にあるファイルは取り直さない。表の差し替えを取り込むときは --force。
 *
 *   npm run fetch
 *   npm run fetch -- --force
 */

import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DOCS, PLACE_DOCS, docUrl, placeUrl, type PlaceDoc, type SourceDoc } from "../src/lib/data/sources.ts";

const RAW_DIR = resolve(import.meta.dirname, "../data/raw");

/** xlsx は zip（PK）、xls は OLE 複合文書。 */
const SIGNATURES = { xlsx: "504b0304", xls: "d0cf11e0" } as const;

export function rawPath(doc: SourceDoc): string {
  return resolve(RAW_DIR, `${doc.year}.${doc.source === "registry" ? "xls" : "xlsx"}`);
}

export function placePath(doc: PlaceDoc, ext: "xls" | "xlsx" = "xlsx"): string {
  return resolve(RAW_DIR, `${doc.year}-pref-${doc.kind}.${ext}`);
}

export async function existingPlacePath(doc: PlaceDoc): Promise<string> {
  for (const ext of ["xlsx", "xls"] as const) {
    const path = placePath(doc, ext);
    if (await exists(path)) return path;
  }
  throw new Error(`${doc.year} ${doc.kind}: 落としたファイルがない`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  await mkdir(RAW_DIR, { recursive: true });
  for (const doc of DOCS) {
    const path = rawPath(doc);
    if (!force && (await exists(path))) continue;
    const url = docUrl(doc);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${doc.year}: ${res.status} ${url}`);
    const body = Buffer.from(await res.arrayBuffer());
    const head = body.subarray(0, 4).toString("hex");
    if (!Object.values(SIGNATURES).includes(head as never)) throw new Error(`${doc.year}: Excel でない応答 ${url}`);
    await writeFile(path, body);
    console.log(`  ${path.split("/").at(-1)}  ${url}`);
  }
  for (const doc of PLACE_DOCS) {
    const xlsx = placePath(doc, "xlsx");
    const xls = placePath(doc, "xls");
    if (!force && ((await exists(xlsx)) || (await exists(xls)))) continue;
    const url = placeUrl(doc);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${doc.year} ${doc.kind}: ${res.status} ${url}`);
    const body = Buffer.from(await res.arrayBuffer());
    const head = body.subarray(0, 4).toString("hex");
    const ext = head === SIGNATURES.xlsx ? "xlsx" : head === SIGNATURES.xls ? "xls" : null;
    if (ext === null) throw new Error(`${doc.year} ${doc.kind}: Excel でない応答 ${url}`);
    const path = placePath(doc, ext);
    await writeFile(path, body);
    console.log(`  ${path.split("/").at(-1)}  ${url}`);
  }
}

if (import.meta.main) await main();
