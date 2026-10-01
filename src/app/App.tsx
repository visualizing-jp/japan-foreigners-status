import { Suspense } from "react";
import { EraView } from "./views/EraView.tsx";
import { MarketsView } from "./views/MarketsView.tsx";
import { StatusView } from "./views/StatusView.tsx";
import { useUrlState } from "./hooks/useUrlState.ts";
import { SeriesBar, SeriesFooter } from "./components/Brand.tsx";

const VIEWS = [
  { id: "era", label: "時代", hint: "2006–" },
  { id: "markets", label: "国・地域", hint: "2006–" },
  { id: "status", label: "在留資格", hint: "2006–" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function App() {
  const [view, setView] = useUrlState<ViewId>("view", "era", (v) => VIEWS.some((x) => x.id === v));

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper/85 backdrop-blur-sm">
        <SeriesBar />
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-4 px-6 pt-5">
          <div className="pb-2">
            <h1 className="text-[15px] font-semibold tracking-tight">日本に住む外国人は、どんな在留資格でいるか</h1>
            <p className="text-[11px] text-muted">出入国在留管理庁「在留外国人統計（旧登録外国人統計）」</p>
          </div>
          <nav className="-mb-px flex gap-1" aria-label="ビュー">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? "page" : undefined}
                className={`cursor-pointer border-b-2 px-3 pt-1 pb-2 text-[13px] whitespace-nowrap transition-colors duration-150 ${
                  view === v.id ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {v.label}
                <span className="ml-1.5 text-[10px] font-normal text-faint max-sm:hidden">{v.hint}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <Suspense key={view} fallback={<Loading />}>
        {view === "era" && <EraView />}
        {view === "markets" && <MarketsView />}
        {view === "status" && <StatusView />}
      </Suspense>

      <footer className="mx-auto w-full max-w-[1240px] px-6 pt-2 pb-10 text-[11px] leading-relaxed text-faint">
        出典: 出入国在留管理庁「在留外国人統計（旧登録外国人統計）」（e-Stat）の各年末の「国籍・地域別 在留資格（在留目的）別 在留外国人」と、2011年末までの「国籍（出身地）別 在留資格（在留目的）別 外国人登録者」。
        在留外国人は中長期在留者と特別永住者で、短期滞在の人を含まない。2011年末までは外国人登録者から数え直した参考値（「時代」の注を参照）。
        各年の表は、国籍・地域の和と在留資格の和が総数に一致することを確かめている。
        <SeriesFooter />
      </footer>
    </div>
  );
}

function Loading() {
  return <div className="mx-auto w-full max-w-[1240px] px-6 py-16 text-[12px] text-faint">読み込み中</div>;
}
