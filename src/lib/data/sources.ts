/**
 * 読む公表資料。e-Stat「在留外国人統計（旧登録外国人統計）」の各年末の第1表。
 *
 * 2011年末までは外国人登録者の表（registry）、2012年末からは在留外国人の表（resident）。
 * 2020・2021年末は e-Stat に「EXCEL 閲覧用」（fileKind=4）しか置かれていない。
 * 2005年以前の表は文字のない画像 PDF なので扱わない。
 */

export const STAT_PAGE = "https://www.e-stat.go.jp/stat-search/files?toukei=00250012&tstat=000001018034";
export const ISA_PAGE = "https://www.moj.go.jp/isa/policies/statistics/index.html";

export type Source = "registry" | "resident";

export interface SourceDoc {
  year: number;
  source: Source;
  statInfId: string;
  fileKind: 0 | 4;
}

const doc = (year: number, statInfId: string, fileKind: 0 | 4 = 0): SourceDoc => ({
  year,
  source: year <= 2011 ? "registry" : "resident",
  statInfId,
  fileKind,
});

export const DOCS: SourceDoc[] = [
  doc(2006, "000001212273"),
  doc(2007, "000001254081"),
  doc(2008, "000004032096"),
  doc(2009, "000007731486"),
  doc(2010, "000009998148"),
  doc(2011, "000013164182"),
  doc(2012, "000021315227"),
  doc(2013, "000024395065"),
  doc(2014, "000029226524"),
  doc(2015, "000031399575"),
  doc(2016, "000031557945"),
  doc(2017, "000031669224"),
  doc(2018, "000031832809"),
  doc(2019, "000031964914"),
  doc(2020, "000032104290", 4),
  doc(2021, "000032212359", 4),
  doc(2022, "000040068461"),
  doc(2023, "000040186952"),
  doc(2024, "000040292366"),
  doc(2025, "000040472260"),
];

export function docUrl(d: { statInfId: string; fileKind: 0 | 4 }): string {
  return `https://www.e-stat.go.jp/stat-search/file-download?statInfId=${d.statInfId}&fileKind=${d.fileKind}`;
}

/**
 * 都道府県の表。2012年末から。2006–2011年は外国人登録者で、短期滞在を県から引けない。
 * 2012–2020年は都道府県×国籍と都道府県×在留資格（総数）の2表。
 * 2021年末以降はテーブルデータの明細（性別・年齢を足して同じ2表にする）。
 */
export type PlaceKind = "nation" | "status" | "cube";

export interface PlaceDoc {
  year: number;
  kind: PlaceKind;
  statInfId: string;
  fileKind: 0 | 4;
}

const place = (year: number, kind: PlaceKind, statInfId: string, fileKind: 0 | 4 = 0): PlaceDoc => ({
  year,
  kind,
  statInfId,
  fileKind,
});

export const PLACE_DOCS: PlaceDoc[] = [
  place(2012, "nation", "000021315232"),
  place(2012, "status", "000021315233"),
  place(2013, "nation", "000024395141"),
  place(2013, "status", "000024395142"),
  place(2014, "nation", "000029226529"),
  place(2014, "status", "000029226530"),
  place(2015, "nation", "000031399580"),
  place(2015, "status", "000031399581"),
  place(2016, "nation", "000031559330"),
  place(2016, "status", "000031559331"),
  place(2017, "nation", "000031669229"),
  place(2017, "status", "000031669230"),
  place(2018, "nation", "000031832814"),
  place(2018, "status", "000031832815"),
  place(2019, "nation", "000031964919"),
  place(2019, "status", "000031964920"),
  place(2020, "nation", "000032104295", 4),
  place(2020, "status", "000032104296", 4),
  place(2021, "cube", "000032213277"),
  place(2022, "cube", "000040068664"),
  place(2023, "cube", "000040186956"),
  place(2024, "cube", "000040292372"),
  place(2025, "cube", "000040472265"),
];

export function placeUrl(d: PlaceDoc): string {
  return docUrl(d);
}

/**
 * 揃えた在留資格。表の名前の違いは parse/table.ts で寄せる。
 * 「技術」と「人文知識・国際業務」（2015年3月まで）は合算し、「投資・経営」は「経営・管理」に寄せる（出入国在留管理庁の推移表と同じ）。
 * 号のある資格（高度専門職・特定技能・技能実習）は号を合算する。
 */
export const STATUSES = [
  "教授",
  "芸術",
  "宗教",
  "報道",
  "高度専門職",
  "経営・管理",
  "法律・会計業務",
  "医療",
  "研究",
  "教育",
  "技術・人文知識・国際業務",
  "企業内転勤",
  "介護",
  "興行",
  "技能",
  "特定技能",
  "技能実習",
  "文化活動",
  "留学",
  "就学",
  "研修",
  "家族滞在",
  "特定活動",
  "永住者",
  "日本人の配偶者等",
  "永住者の配偶者等",
  "定住者",
  "特別永住者",
] as const;

/** 外国人登録者のうち、いまの在留外国人に当たらない区分。2011年末までの表にだけある。 */
export const EXCLUDED = ["短期滞在", "未取得者", "一時庇護", "その他"] as const;

export type Status = (typeof STATUSES)[number];
export type Excluded = (typeof EXCLUDED)[number];

export const TOTAL = "総数";
