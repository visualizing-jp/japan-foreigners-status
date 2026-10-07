/**
 * data/raw の各年末の表を読み、data/normalized/tables.json に書く。
 *
 *   npm run normalize
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DOCS, PLACE_DOCS } from "../src/lib/data/sources.ts";
import { readPlaceYear } from "../src/lib/parse/places.ts";
import { readTable } from "../src/lib/parse/table.ts";
import { existingPlacePath, rawPath } from "./fetch-data.ts";

const OUT_DIR = resolve(import.meta.dirname, "../data/normalized");

const tables = DOCS.map((doc) => readTable(rawPath(doc), doc.year, doc.source));
await mkdir(OUT_DIR, { recursive: true });
await writeFile(resolve(OUT_DIR, "tables.json"), `${JSON.stringify(tables)}\n`);
for (const t of tables) console.log(`  ${t.year}  総数 ${t.rows[0]!.total.toLocaleString("ja-JP")}  ${t.rows.length - 1}か国・地域`);

const byYear = new Map<number, { nationPath?: string; statusPath?: string; cubePath?: string }>();
for (const doc of PLACE_DOCS) {
  const path = await existingPlacePath(doc);
  const cur = byYear.get(doc.year) ?? {};
  if (doc.kind === "cube") cur.cubePath = path;
  if (doc.kind === "nation") cur.nationPath = path;
  if (doc.kind === "status") cur.statusPath = path;
  byYear.set(doc.year, cur);
}
const places = [...byYear.entries()]
  .sort(([a], [b]) => a - b)
  .map(([year, paths]) => readPlaceYear({ year, ...paths }));
await writeFile(resolve(OUT_DIR, "places.json"), `${JSON.stringify(places)}\n`);
for (const p of places) {
  const total = Object.values(p.totals).reduce((a, n) => a + n, 0);
  console.log(`  ${p.year}  都道府県 ${total.toLocaleString("ja-JP")}`);
}
