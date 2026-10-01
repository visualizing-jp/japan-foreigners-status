/**
 * 配信データの取得。一度しか取りに行かない。
 */

import type { StatusJson } from "../../lib/data/cube.ts";

let cache: Promise<StatusJson> | null = null;

export function loadStatus(): Promise<StatusJson> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/status.json`).then((r) => {
    if (!r.ok) throw new Error(`status.json の取得に失敗しました (${r.status})`);
    return r.json() as Promise<StatusJson>;
  });
  return cache;
}
