/**
 * data/raw の各年末の表を読み、data/normalized/tables.json に書く。
 *
 *   npm run normalize
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DOCS } from "../src/lib/data/sources.ts";
import { readTable } from "../src/lib/parse/table.ts";
import { rawPath } from "./fetch-data.ts";

const OUT_DIR = resolve(import.meta.dirname, "../data/normalized");

const tables = DOCS.map((doc) => readTable(rawPath(doc), doc.year, doc.source));
await mkdir(OUT_DIR, { recursive: true });
await writeFile(resolve(OUT_DIR, "tables.json"), `${JSON.stringify(tables)}\n`);
for (const t of tables) console.log(`  ${t.year}  総数 ${t.rows[0]!.total.toLocaleString("ja-JP")}  ${t.rows.length - 1}か国・地域`);
