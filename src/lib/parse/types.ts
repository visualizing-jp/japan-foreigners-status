import type { Excluded, Source, Status } from "../data/sources.ts";

export interface NationRow {
  /** 表の国籍・地域名。0 行目は「総数」。 */
  name: string;
  /** 表の「総数」列（外国人登録者は除く区分も含んだ数）。 */
  total: number;
  values: Partial<Record<Status | Excluded, number>>;
}

export interface YearTable {
  year: number;
  source: Source;
  rows: NationRow[];
}

/** 2012年末からの都道府県。statuses と nations は県ごとの周辺。 */
export interface PlaceYear {
  year: number;
  totals: Record<string, number>;
  statuses: Record<string, Partial<Record<Status, number>>>;
  nations: Record<string, Record<string, number>>;
  /** 都道府県が未定・不詳の人数。全国との差。 */
  unknown: number;
  unknownStatuses: Partial<Record<Status, number>>;
}
