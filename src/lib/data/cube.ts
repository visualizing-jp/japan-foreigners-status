import type { Source, Status } from "./sources.ts";

/**
 * 配信データ。行は国籍・地域（0 行目は総数）、列は年（各年末）。
 * values[n][y] は statuses と同じ並びの人数。その年の表に行がなければ null。
 *
 * 2011年末までは外国人登録者のうち在留外国人に当たる在留資格の人数（出入国在留管理庁の推移表と同じ数え方）。
 */
export interface StatusJson {
  years: number[];
  source: Source[];
  statuses: Status[];
  names: string[];
  values: (number[] | null)[][];
}
