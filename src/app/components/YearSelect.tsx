/** 年の選択。年は数十あるので、切替ではなくネイティブの select にする。 */
export function YearSelect({
  years,
  value,
  onChange,
  format = (y) => `${y}年`,
}: {
  years: number[];
  value: number;
  onChange: (year: number) => void;
  format?: (year: number) => string;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[12px] text-muted">
      <span className="sr-only">年</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tnum cursor-pointer rounded-md border border-rule bg-surface px-2 py-1 text-[12px] font-medium text-ink transition-[border-color] duration-150 ease-out hover:border-rule-strong"
      >
        {[...years].reverse().map((y) => (
          <option key={y} value={y}>
            {format(y)}
          </option>
        ))}
      </select>
    </label>
  );
}
