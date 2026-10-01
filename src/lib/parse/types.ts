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
