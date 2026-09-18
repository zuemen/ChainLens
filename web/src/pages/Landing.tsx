import { Link } from 'react-router-dom'
import { CaseReplay } from '../components/CaseReplay'
import { DualEngineDiagram } from '../components/DualEngineDiagram'
import { StepF1Chart } from '../components/StepF1Chart'
import { KEY_FACTS, PAIN_POINTS, type Source } from '../content/briefing'
import { DECISION_COLOR, DECISION_ZH, SCENARIOS_FALLBACK } from '../content/scenarios'

/** 三個數字：財損、穩定幣占比、金檢開罰。來源沿用 briefing.ts */
const NUMBERS = [
  { value: '893', unit: '億元', label: '2025 年全臺詐騙財損', source: KEY_FACTS[0].source },
  { value: '84', unit: '%', label: '穩定幣占 2025 年非法虛擬資產交易量', source: PAIN_POINTS[4].source },
  { value: '11', unit: '家', label: '金檢 17 家 VASP，11 家開罰：未評估提幣資金流向', source: KEY_FACTS[2].source },
]

const DONE = [
  '規則引擎：4 類洗錢圖樣＋上游 4 階關聯傳導',
  '結構模型：GraphSAGE 13 特徵，模型只升不降',
  '八個情境、三級處置、STR 草稿',
  '網站、API 與金流圖譜工作台',
  '自動化測試持續整合',
]

const ROADMAP = [
  '結構模型以真實標註資料驗證',
  '判定證據持久化稽核留存',
  '跨實例限流與混幣服務偵測',
  '比特幣／以太坊即時擷取',
  '臺灣在地標註資料集',
]

function SourceLink({ source }: { source: Source }) {
  return (
    <a href={source.url} target="_blank" rel="noreferrer" className="text-muted underline decoration-1 underline-offset-4 hover:text-text">
      {source.label}
    </a>
  )
}

function SectionHead({ index, kicker, title, lead }: { index: string; kicker: string; title: string; lead?: string }) {
  return (
    <header className="grid gap-x-8 gap-y-2 md:grid-cols-[4rem_1fr]">
      <div className="tabular text-4xl font-black leading-none text-line-strong" aria-hidden="true">{index}</div>
      <div>
        <div className="kicker">{kicker}</div>
        <h2 className="mt-1 text-2xl font-black leading-snug md:text-4xl">{title}</h2>
        {lead && <p className="mt-3 max-w-3xl leading-relaxed text-muted">{lead}</p>}
      </div>
    </header>
  )
}

export default function Landing() {
  return (
    <div>
      {/* ── 主視覺：一句話＋案件重演 ── */}
      <section className="hero-glow relative overflow-hidden">
        <div className="stage-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 pb-4 pt-12 md:px-6 md:pt-16 2xl:max-w-7xl">
          <div className="reveal max-w-4xl">
            <div className="kicker">虛擬資產出金審查・規則引擎＋結構模型</div>
            <h1 className="mt-4 text-4xl font-black leading-[1.15] md:text-6xl">
              錢出去之前，
              <br />
              先看它從哪裡來。
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              名單只認得已通報的地址。鏈鏡在出金當下沿鏈上資金路徑追溯上游，
              第二個引擎補抓規則沒寫到的變體——每個判定都附證據鏈，人做最後決定。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/screening?auto=1" className="bg-signal px-6 py-3 font-bold text-ink hover:opacity-90">
                操作即時審查
              </Link>
              <a href="#pains" className="border border-line-strong px-6 py-3 font-bold hover:border-text">
                八個痛點，八個情境
              </a>
            </div>
          </div>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 2xl:max-w-7xl">
          <div className="kicker pt-6">案件重演・合成劇本</div>
        </div>
        <CaseReplay />
      </section>

      {/* ── 三個數字 ── */}
      <section className="border-y border-line bg-surface">
        <dl className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6 2xl:max-w-7xl">
          {NUMBERS.map((item) => (
            <div key={item.label} className="border-l-2 border-signal pl-5">
              <dd className="flex items-baseline gap-1">
                <span className="big-num text-6xl">{item.value}</span>
                <span className="text-lg font-bold text-muted">{item.unit}</span>
              </dd>
              <dt className="mt-2 leading-snug">{item.label}</dt>
              <dd className="mt-1 text-xs"><SourceLink source={item.source} /></dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 壹 八個痛點 → 八個情境 ── */}
      <section id="pains" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 md:px-6 2xl:max-w-7xl">
        <SectionHead
          index="01"
          kicker="痛點 → 情境"
          title="八個痛點，各對一個可以親手跑的情境"
          lead="每一格都能點：直接跳到出金審查、自動執行該情境。既有六個痛點附公開出處；痛點 7、8 只用我們自己的劇本數字與反事實。"
        />
        <ol className="mt-10 grid gap-3 md:grid-cols-2">
          {PAIN_POINTS.map((item, index) => {
            const scenario = SCENARIOS_FALLBACK.find((entry) => entry.id === item.scenario) ?? SCENARIOS_FALLBACK[0]
            return (
              <li key={item.pain} className="flex flex-col border border-line bg-surface">
                {/* 來源連結不能包在 Link 裡（a 不可巢狀），所以卡片主體與來源列分開 */}
                <Link
                  to={`/screening?case=${scenario.id}&auto=1`}
                  className="group grid flex-1 grid-cols-[3rem_1fr] gap-4 p-5 transition-colors hover:bg-surface-2"
                >
                  <div className="tabular text-2xl font-black text-line-strong group-hover:text-text">{String(index + 1).padStart(2, '0')}</div>
                  <div>
                    <h3 className="text-lg font-black leading-snug">{item.pain}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{item.evidence}</p>
                    <p className="mt-3 text-sm leading-relaxed">{item.solution}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
                      <span className="font-bold">
                        <span className="tabular text-muted">情境 {String(scenario.id).padStart(2, '0')}</span>　{scenario.title_zh}
                        <span className="ml-2" style={{ color: DECISION_COLOR[scenario.expect] }}>● {DECISION_ZH[scenario.expect]}</span>
                      </span>
                      <span className="text-muted group-hover:text-text">跑一次 →</span>
                    </div>
                  </div>
                </Link>
                <p className="border-t border-line px-5 py-2 pl-[5rem] text-xs">來源：<SourceLink source={item.source} /></p>
              </li>
            )
          })}
        </ol>
      </section>

      {/* ── 貳 雙引擎 ── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 2xl:max-w-7xl">
          <SectionHead
            index="02"
            kicker="架構"
            title="兩個引擎，一個處置"
            lead="規則引擎負責可稽核的暫緩／加強審查／放行；結構模型只能把「放行」升為「加強審查」，抓規則沒寫到的變體。"
          />
          <div className="mt-8 border border-line bg-ink p-2 md:p-6">
            <DualEngineDiagram />
          </div>
          <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
            <div className="border-l-2 border-text pl-4">
              <div className="font-bold">規則引擎決定暫緩</div>
              <p className="mt-1 text-muted">暫緩出金必須有可稽核的證據鏈：圖樣、階數、路徑、逐筆金額與時間。</p>
            </div>
            <div className="border-l-2 border-model pl-4">
              <div className="font-bold" style={{ color: 'var(--color-model)' }}>模型只升不降</div>
              <p className="mt-1 text-muted">情境七：規則 0.19 放行、模型 0.98 → 加強審查。不能單獨暫緩，不能降級。</p>
            </div>
            <div className="border-l-2 border-pass pl-4">
              <div className="font-bold">不誤傷</div>
              <p className="mt-1 text-muted">情境八：交易所熱錢包批次出金的用戶 0.02 放行；若沒有實體標註會 1.00 暫緩、30 名連坐。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 參 研究 ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 2xl:max-w-7xl">
        <SectionHead
          index="03"
          kicker="研究驗證"
          title="手法一變，單一模型會同時失效——所以不押一個模型"
          lead="Elliptic 公開資料集（203,769 節點）：Random Forest F1 0.806、GraphSAGE＋RMP 0.661；第 43 期起三個模型同時跌到接近 0。"
        />
        <div className="mt-8 border border-line bg-surface p-4 md:p-6">
          <StepF1Chart />
        </div>
        <Link to="/research" className="mt-4 inline-block font-bold underline underline-offset-4">
          看完整研究：為什麼是兩個引擎 →
        </Link>
      </section>

      {/* ── 肆 現況／規劃 ── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 2xl:max-w-7xl">
          <SectionHead
            index="04"
            kicker="現況與規劃"
            title="已經可以操作的，與接下來要做的"
            lead="示範情境為合成劇本資料；結構模型尚未用真實標註資料驗證；尚無商業客戶。原始碼與測試全部公開。"
          />
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="flex items-baseline justify-between border-b-2 border-pass pb-2 text-lg font-bold text-pass">
                已實作 <span className="text-sm font-medium">現在就能操作</span>
              </h3>
              <ul>
                {DONE.map((item) => (
                  <li key={item} className="flex gap-3 border-b border-line py-3">
                    <span className="text-pass" aria-hidden="true">●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="flex items-baseline justify-between border-b-2 border-line-strong pb-2 text-lg font-bold text-muted">
                發展藍圖 <span className="text-sm font-medium">尚未實作</span>
              </h3>
              <ul>
                {ROADMAP.map((item) => (
                  <li key={item} className="flex gap-3 border-b border-line py-3 text-muted">
                    <span aria-hidden="true">○</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 行動呼籲 ── */}
      <section className="hero-glow">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-[1fr_auto] md:items-center md:px-6 2xl:max-w-7xl">
          <p className="text-3xl font-black leading-snug md:text-4xl">在錢出去之前，看見它要去哪裡。</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/screening?auto=1" className="bg-signal px-6 py-3 font-bold text-ink hover:opacity-90">
              操作即時審查
            </Link>
            <Link to="/workbench" className="border border-line-strong px-6 py-3 font-bold hover:border-text">
              金流圖譜工作台
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
