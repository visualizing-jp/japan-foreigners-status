/**
 * sources.ts の各年末の表を data/raw/{year}.xlsx に落とす（2011年末までは .xls）。
 * 既にあるファイルは取り直さない。表の差し替えを取り込むときは --force。
 *
 *   npm run fetch
 *   npm run fetch -- --force
 */

import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DOCS, docUrl, type SourceDoc } from "../src/lib/data/sources.ts";

const RAW_DIR = resolve(import.meta.dirname, "../data/raw");

/** xlsx は zip（PK）、xls は OLE 複合文書。 */
const SIGNATURES = { xlsx: "504b0304", xls: "d0cf11e0" } as const;

export function rawPath(doc: SourceDoc): string {
  return resolve(RAW_DIR, `${doc.year}.${doc.source === "registry" ? "xls" : "xlsx"}`);
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
}

if (import.meta.main) await main();
