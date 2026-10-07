import { Link } from 'react-router-dom'
import { CaseReplay } from '../components/CaseReplay'
import { DualEngineDiagram } from '../components/DualEngineDiagram'
import { StepF1Chart } from '../components/StepF1Chart'
import { KEY_FACTS, PAIN_POINTS, type Source } from '../content/briefing'
import { DECISION_COLOR, DECISION_EN, DECISION_ZH, SCENARIOS_FALLBACK } from '../content/scenarios'
import { useLang } from '../i18n'

/** 三個數字：財損、穩定幣占比、金檢開罰。來源沿用 briefing.ts */
const NUMBERS = [
  {
    value: '893',
    unit: '億元',
    label: '2025 年全臺詐騙財損',
    // 英文版換算為美元會變成推算數字；照來源原文保留新臺幣
    value_en: 'NT$89.3',
    unit_en: 'bn',
    label_en: 'Fraud losses in Taiwan, 2025',
    source: KEY_FACTS[0].source,
  },
  {
    value: '84',
    unit: '%',
    label: '穩定幣占 2025 年非法虛擬資產交易量',
    value_en: '84',
    unit_en: '%',
    label_en: "Stablecoins' share of illicit virtual-asset volume, 2025",
    source: PAIN_POINTS[4].source,
  },
  {
    value: '11',
    unit: '家',
    label: '金檢 17 家 VASP，11 家開罰：未評估提幣資金流向',
    value_en: '11',
    unit_en: 'of 17',
    label_en: "VASPs examined by Taiwan's FSC that were fined — including for not assessing where withdrawn funds go",
    source: KEY_FACTS[2].source,
  },
]

const DONE = [
  { zh: '規則引擎：4 類洗錢圖樣＋上游 4 階關聯傳導', en: 'Rule engine: 4 laundering patterns + risk propagation up to 4 hops upstream' },
  { zh: 'GNN 模型：GraphSAGE 13 特徵，模型只升不降', en: 'GNN model: GraphSAGE on 13 features — it can escalate, never downgrade' },
  { zh: '八個情境、三級處置、STR 草稿', en: 'Eight scenarios, three-tier decisions, STR drafts' },
  { zh: '網站、API 與金流圖譜工作台', en: 'Website, API and fund-flow graph workbench' },
  { zh: '自動化測試持續整合', en: 'Automated tests in continuous integration' },
]

const ROADMAP = [
  { zh: 'GNN 模型以真實標註資料驗證', en: 'Validate the GNN model on real labelled data' },
  { zh: '判定證據持久化稽核留存', en: 'Persist decision evidence for audit' },
  { zh: '跨實例限流與混幣服務偵測', en: 'Cross-instance rate limiting and mixer detection' },
  { zh: '比特幣／以太坊即時擷取', en: 'Live Bitcoin / Ethereum ingestion' },
  { zh: '臺灣在地標註資料集', en: 'A locally labelled Taiwan dataset' },
]

function SourceLink({ source }: { source: Source }) {
  const { t } = useLang()
  return (
    <a href={source.url} target="_blank" rel="noreferrer" className="text-muted underline decoration-1 underline-offset-4 hover:text-text">
      {t(source.label, source.label_en)}
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
  const { t, lang } = useLang()
  const decisionText = lang === 'en' ? DECISION_EN : DECISION_ZH
  return (
    <div>
      {/* ── 主視覺：一句話＋案件重演 ── */}
      <section className="hero-glow relative overflow-hidden">
        <div className="stage-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 pb-4 pt-12 md:px-6 md:pt-16 2xl:max-w-7xl">
          <div className="reveal max-w-4xl">
            <div className="kicker">{t('虛擬資產出金審查・規則引擎＋圖神經網路模型', 'Crypto withdrawal screening · rule engine + graph neural network')}</div>
            <h1 className="mt-4 text-4xl font-black leading-[1.15] md:text-6xl">
              {t('錢出去之前，', 'Before the money leaves,')}
              <br />
              {t('先看它從哪裡來。', 'see where it came from.')}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              {t(
                '名單只認得已通報的地址。鏈鏡在出金當下沿鏈上資金路徑追溯上游，第二個引擎補抓規則沒寫到的變體——每個判定都附證據鏈，人做最後決定。',
                "Blacklists only know addresses that have already been reported. At the moment of withdrawal, ChainLens traces the on-chain fund path upstream, and a second engine catches variants the rules don't cover. Every decision comes with its evidence chain, and a person makes the final call.",
              )}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/screening?auto=1" className="bg-signal px-6 py-3 font-bold text-ink hover:opacity-90">
                {t('操作即時審查', 'Try live screening')}
              </Link>
              <a href="#pains" className="border border-line-strong px-6 py-3 font-bold hover:border-text">
                {t('八個痛點，八個情境', 'Eight pain points, eight scenarios')}
              </a>
            </div>
          </div>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 2xl:max-w-7xl">
          <div className="kicker pt-6">{t('案件重演・合成劇本', 'Case replay · synthetic scenario')}</div>
        </div>
        <CaseReplay />
      </section>

      {/* ── 三個數字 ── */}
      <section className="border-y border-line bg-surface">
        <dl className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6 2xl:max-w-7xl">
          {NUMBERS.map((item) => (
            <div key={item.label} className="border-l-2 border-signal pl-5">
              <dd className="flex items-baseline gap-1">
                <span className="big-num text-6xl">{t(item.value, item.value_en)}</span>
                <span className="text-lg font-bold text-muted">{t(item.unit, item.unit_en)}</span>
              </dd>
              <dt className="mt-2 leading-snug">{t(item.label, item.label_en)}</dt>
              <dd className="mt-1 text-xs"><SourceLink source={item.source} /></dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 壹 八個痛點 → 八個情境 ── */}
      <section id="pains" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 md:px-6 2xl:max-w-7xl">
        <SectionHead
          index="01"
          kicker={t('痛點 → 情境', 'Pain point → scenario')}
          title={t('八個痛點，各對一個可以親手跑的情境', 'Eight pain points, each with a scenario you can run yourself')}
          lead={t(
            '每一格都能點：直接跳到出金審查、自動執行該情境。既有六個痛點附公開出處；痛點 7、8 只用我們自己的劇本數字與反事實。',
            'Every card is clickable: it jumps to screening and runs that scenario. The first six pain points cite public sources; points 7 and 8 use only our own scenario numbers and counterfactuals. Sources are Taiwanese and mostly in Chinese.',
          )}
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
                    <h3 className="text-lg font-black leading-snug">{t(item.pain, item.pain_en)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{t(item.evidence, item.evidence_en)}</p>
                    <p className="mt-3 text-sm leading-relaxed">{t(item.solution, item.solution_en)}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
                      <span className="font-bold">
                        <span className="tabular text-muted">{t('情境', 'Scenario')} {String(scenario.id).padStart(2, '0')}</span>　{t(scenario.title_zh, scenario.title_en)}
                        <span className="ml-2" style={{ color: DECISION_COLOR[scenario.expect] }}>● {decisionText[scenario.expect]}</span>
                      </span>
                      <span className="text-muted group-hover:text-text">{t('跑一次 →', 'Run it →')}</span>
                    </div>
                  </div>
                </Link>
                <p className="border-t border-line px-5 py-2 pl-[5rem] text-xs">{t('來源：', 'Source: ')}<SourceLink source={item.source} /></p>
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
            kicker={t('架構', 'Architecture')}
            title={t('兩個引擎，一個處置', 'Two engines, one decision')}
            lead={t(
              '規則引擎負責可稽核的暫緩／加強審查／放行；GNN 模型只能把「放行」升為「加強審查」，抓規則沒寫到的變體。',
              `The rule engine makes the auditable call — hold, enhanced review or release. The GNN model can only raise "release" to "enhanced review", catching variants the rules don't cover.`,
            )}
          />
          <div className="mt-8 border border-line bg-ink p-2 md:p-6">
            <DualEngineDiagram />
          </div>
          <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
            <div className="border-l-2 border-text pl-4">
              <div className="font-bold">{t('規則引擎決定暫緩', 'The rule engine decides to hold')}</div>
              <p className="mt-1 text-muted">{t('暫緩出金必須有可稽核的證據鏈：圖樣、階數、路徑、逐筆金額與時間。', 'Holding a withdrawal requires an auditable evidence chain: pattern, hop distance, path, and every amount and timestamp.')}</p>
            </div>
            <div className="border-l-2 border-model pl-4">
              <div className="font-bold" style={{ color: 'var(--color-model)' }}>{t('模型只升不降', 'The model only escalates')}</div>
              <p className="mt-1 text-muted">{t('情境七：規則 0.19 放行、模型 0.98 → 加強審查。不能單獨暫緩，不能降級。', "Scenario 7: rules 0.19 release, model 0.98 → enhanced review. It can't hold on its own and can't downgrade.")}</p>
            </div>
            <div className="border-l-2 border-pass pl-4">
              <div className="font-bold">{t('不誤傷', 'No collateral damage')}</div>
              <p className="mt-1 text-muted">{t('情境八：交易所熱錢包批次出金的用戶 0.02 放行；若沒有實體標註會 1.00 暫緩、30 名連坐。', 'Scenario 8: a user paid by an exchange hot-wallet batch scores 0.02 and is released; without the entity label it would be 1.00, held, with 30 users penalised.')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 參 研究 ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 2xl:max-w-7xl">
        <SectionHead
          index="03"
          kicker={t('研究驗證', 'Research')}
          title={t('手法一變，單一模型會同時失效——所以不押一個模型', "When the technique changes, single models fail together — so we don't bet on one")}
          lead={t(
            'Elliptic 公開資料集（203,769 節點）：Random Forest F1 0.806、GraphSAGE＋RMP 0.661；第 43 期起三個模型同時跌到接近 0。',
            'On the public Elliptic dataset (203,769 nodes): Random Forest F1 0.806, GraphSAGE + RMP 0.661 — and from period 43 all three models drop to near 0.',
          )}
        />
        <div className="mt-8 border border-line bg-surface p-4 md:p-6">
          <StepF1Chart />
        </div>
        <Link to="/research" className="mt-4 inline-block font-bold underline underline-offset-4">
          {t('看完整研究：為什麼是兩個引擎 →', 'Read the research: why two engines →')}
        </Link>
      </section>

      {/* ── 肆 現況／規劃 ── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 2xl:max-w-7xl">
          <SectionHead
            index="04"
            kicker={t('現況與規劃', 'Status and roadmap')}
            title={t('已經可以操作的，與接下來要做的', 'What works today, and what comes next')}
            lead={t(
              '示範情境為合成劇本資料；GNN 模型尚未用真實標註資料驗證；尚無商業客戶。原始碼與測試全部公開。',
              'Demo scenarios use synthetic data; the GNN model has not been validated on real labelled data; there are no commercial clients yet. All source code and tests are public.',
            )}
          />
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="flex items-baseline justify-between border-b-2 border-pass pb-2 text-lg font-bold text-pass">
                {t('已實作', 'Built')} <span className="text-sm font-medium">{t('現在就能操作', 'Usable now')}</span>
              </h3>
              <ul>
                {DONE.map((item) => (
                  <li key={item.zh} className="flex gap-3 border-b border-line py-3">
                    <span className="text-pass" aria-hidden="true">●</span>
                    {t(item.zh, item.en)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="flex items-baseline justify-between border-b-2 border-line-strong pb-2 text-lg font-bold text-muted">
                {t('發展藍圖', 'Roadmap')} <span className="text-sm font-medium">{t('尚未實作', 'Not built yet')}</span>
              </h3>
              <ul>
                {ROADMAP.map((item) => (
                  <li key={item.zh} className="flex gap-3 border-b border-line py-3 text-muted">
                    <span aria-hidden="true">○</span>
                    {t(item.zh, item.en)}
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
          <p className="text-3xl font-black leading-snug md:text-4xl">{t('在錢出去之前，看見它要去哪裡。', 'See where the money is going — before it goes.')}</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/screening?auto=1" className="bg-signal px-6 py-3 font-bold text-ink hover:opacity-90">
              {t('操作即時審查', 'Try live screening')}
            </Link>
            <Link to="/workbench" className="border border-line-strong px-6 py-3 font-bold hover:border-text">
              {t('金流圖譜工作台', 'Fund-flow graph workbench')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
