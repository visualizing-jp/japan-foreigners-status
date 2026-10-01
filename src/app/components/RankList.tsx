/**
 * 国・地域の一覧。右端は値と、一覧の最大を基準にした棒。
 * indent のある行は字下げして置く。
 */

import { useEffect, useRef } from "react";

export interface RankRow {
  name: string;
  /** 一覧の右端に出す文字。 */
  label: string;
  /** 棒の長さの元。 */
  value: number;
  indent: number;
  color?: string;
}

export function RankList({
  rows,
  selected,
  onSelect,
  noneLabel,
  noneValue,
}: {
  rows: RankRow[];
  /** 空文字は「選んでいない」。 */
  selected: string;
  onSelect: (name: string) => void;
  /** 先頭に置く「選ばない」行。ないときは置かない。 */
  noneLabel?: string;
  noneValue?: string;
}) {
  const max = Math.max(...rows.filter((r) => r.indent === 0).map((r) => r.value), 1e-9);
  const boxRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // 選んだ行が見えるよう、一覧の枠の中だけをスクロールする。scrollIntoView はページごと動かす。
  useEffect(() => {
    const box = boxRef.current;
    const el = selectedRef.current;
    if (box === null || el === null || box.scrollHeight <= box.clientHeight) return;
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.top < b.top) box.scrollTop += r.top - b.top;
    else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom;
  }, [selected]);

  const rowClass = (on: boolean) =>
    `flex w-full cursor-pointer items-center gap-2 rounded px-2 py-[3px] text-left transition-[background-color,transform] duration-150 ease-out active:scale-[0.99] ${
      on ? "bg-ink/[0.06]" : "hover:bg-ink/[0.03]"
    }`;

  return (
    <div ref={boxRef} className="min-h-0 flex-1 overflow-y-auto max-lg:max-h-[420px]">
      <ul className="flex flex-col">
        {noneLabel !== undefined && (
          <li className="mb-1 border-b border-rule pb-1">
            <button
              type="button"
              ref={selected === "" ? selectedRef : null}
              onClick={() => onSelect("")}
              aria-pressed={selected === ""}
              className={rowClass(selected === "")}
            >
              <span className={`flex-1 text-[12px] ${selected === "" ? "font-semibold text-ink" : "text-muted"}`}>
                {noneLabel}
              </span>
              <span className="tnum text-[11px] text-faint">{noneValue}</span>
            </button>
          </li>
        )}
        {rows.map((row) => {
          const on = row.name === selected;
          return (
            <li key={row.name}>
              <button
                type="button"
                ref={on ? selectedRef : null}
                onClick={() => onSelect(row.name)}
                aria-pressed={on}
                className={rowClass(on)}
              >
                <span
                  aria-hidden
                  className="size-[9px] shrink-0 rounded-[2px]"
                  style={{ backgroundColor: row.color ?? "transparent" }}
                />
                <span
                  className={`min-w-0 flex-1 truncate text-[12px] ${on ? "font-semibold text-ink" : "text-muted"}`}
                  style={{ paddingLeft: row.indent * 12 }}
                >
                  {row.name}
                </span>
                <span className={`tnum shrink-0 text-right text-[11px] ${on ? "text-ink" : "text-faint"}`}>
                  {row.label}
                </span>
                <span className="h-[9px] w-[44px] shrink-0 bg-ink/[0.05]">
                  <span
                    className={`block h-full ${on ? "bg-ink" : "bg-ink/30"}`}
                    style={{ width: `${Math.min(1, row.value / max) * 100}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
