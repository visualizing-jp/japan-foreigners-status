/** 確定前の値を含む印。色は系列に使うので、墨色の枠で示す。 */
export function Preliminary({ label = "推計" }: { label?: string }) {
  return (
    <span className="ml-1.5 inline-block rounded-[3px] border border-ink/60 px-1 text-[10px] leading-[14px] font-medium text-ink">
      {label}
    </span>
  );
}
