import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, getScenarios, postScreen } from '../api/client'
import { SCREENING_SNAPSHOT } from '../api/snapshot'
import type { Scenario, ScreenResult } from '../api/types'
import { DecisionCard } from '../components/DecisionCard'
import { ErrorNotice } from '../components/ErrorNotice'
import { Panel } from '../components/Panel'
import { DECISION_COLOR, DECISION_EN, DECISION_ZH, FOCUS_LAYOUT_IDS, SCENARIOS_FALLBACK } from '../content/scenarios'
import { FocusGraph } from '../graph/FocusGraph'
import { MOTIF_EN, MOTIF_ZH } from '../graph/motifs'
import { ScenarioGraph } from '../graph/ScenarioGraph'
import { useLang } from '../i18n'

/** 證據鏈預設只列最接近的幾條，其餘收合 */
const EVIDENCE_PREVIEW = 4

function scenarioFromParam(list: Scenario[], raw: string | null): Scenario {
  const id = Number(raw)
  return list.find((item) => item.id === id) ?? list[0]
}

export default function Screening() {
  const { t, lang } = useLang()
  const decisionText = lang === 'en' ? DECISION_EN : DECISION_ZH
  const motifText = lang === 'en' ? MOTIF_EN : MOTIF_ZH
  const [searchParams] = useSearchParams()
  const [scenarios, setScenarios] = useState<Scenario[]>(SCENARIOS_FALLBACK)
  const initial = scenarioFromParam(SCENARIOS_FALLBACK, searchParams.get('case'))
  const [target, setTarget] = useState(initial.target)
  const [amount, setAmount] = useState(initial.amount_usdt)
  const [result, setResult] = useState<ScreenResult | null>(null)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAllEvidence, setShowAllEvidence] = useState(false)
  const active = scenarios.find((item) => item.target === target) ?? scenarios[0]

  async function run(nextTarget = target, nextAmount = amount) {
    setLoading(true)
    setError(null)
    try {
      setResult(await postScreen(nextTarget, nextAmount))
      setOffline(false)
    } catch (err) {
      // 完全無法連線（斷網/DNS/CORS）或後端本身出錯（5xx，含冷啟動逾時）時退回內建快照，
      // 讓現場演示不中斷；畫面會明確標示為離線快照。4xx 是設定問題，照實顯示錯誤。
      if (err instanceof ApiError && (err.status === 0 || err.status >= 500) && nextTarget === SCREENING_SNAPSHOT.target) {
        setResult(SCREENING_SNAPSHOT)
        setOffline(true)
      } else {
        setResult(null)
        setOffline(false)
        setError(err instanceof ApiError ? err.detail : t('審查失敗，請稍後再試。', 'Screening failed — please try again shortly.'))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 情境定義以 API 為準；失敗時保留內建常數（與後端同一份）
    getScenarios()
      .then((list) => {
        if (list.length > 0) setScenarios(list)
      })
      .catch(() => undefined)
    // 從首頁痛點或簡報進來（?case=N&auto=1）直接跑，評審不必再找按鈕
    if (searchParams.get('auto') === '1') void run()
    // 只在進頁時觸發一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pick(next: Scenario) {
    setTarget(next.target)
    setAmount(next.amount_usdt)
    setShowAllEvidence(false)
    void run(next.target, next.amount_usdt)
  }

  function downloadStr() {
    if (!result) return
    const draft = t(result.str_draft_zh, result.str_draft_en)
    if (!draft) return
    const url = URL.createObjectURL(new Blob([draft], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `STR_draft_${result.target}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const shown = result && result.target === target ? result : null
  const strDraft = shown ? t(shown.str_draft_zh, shown.str_draft_en) : null

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="kicker">{t('即時出金審查・雙引擎', 'Live withdrawal screening · dual engine')}</div>
          <h1 className="mt-1 text-3xl font-black leading-tight md:text-4xl">{t('出金審查', 'Withdrawal screening')}</h1>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          {t(
            '八個情境，三種處置。點任一情境，約 1 秒看到規則引擎與 GNN 模型各自的判斷。',
            'Eight scenarios, three possible decisions. Pick one and in about a second you see what the rule engine and the GNN model each conclude. All addresses and amounts are synthetic.',
          )}
        </p>
      </header>

      {/* 情境列：8 個 chip，色點＝預期處置 */}
      <div role="radiogroup" aria-label={t('選擇示範情境', 'Choose a demo scenario')} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {scenarios.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.target === target}
            onClick={() => pick(item)}
            className="chip"
          >
            <span className="chip-id">{String(item.id).padStart(2, '0')}</span>
            <span className="chip-dot" style={{ background: DECISION_COLOR[item.expect] }} aria-hidden="true" />
            <span className="text-sm font-bold leading-tight">{t(item.title_zh, item.title_en)}</span>
            <span className="sr-only">{t('，預期', ', expected: ')}{decisionText[item.expect]}</span>
          </button>
        ))}
      </div>

      <Panel>
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="tabular text-sm text-muted">{t('情境', 'Scenario')} {String(active.id).padStart(2, '0')}</span>
              <span className="text-xl font-black">{t(active.title_zh, active.title_en)}</span>
              <span className="text-sm" style={{ color: DECISION_COLOR[active.expect] }}>{t('預期：', 'Expected: ')}{decisionText[active.expect]}</span>
            </div>
            <p className="mt-2 leading-relaxed text-muted">{t(active.summary_zh, active.summary_en)}</p>
            <p className="mt-1 text-sm text-muted">{t('痛點：', 'Pain point: ')}{t(active.pain_zh, active.pain_en)}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs text-muted">{t('申請金額（USDT）', 'Requested amount (USDT)')}</span>
              <input
                type="number"
                min={1}
                step={1000}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="tabular mt-1 w-40 border p-2.5"
              />
            </label>
            <button
              type="button"
              onClick={() => run()}
              disabled={loading}
              className="bg-signal px-6 py-2.5 font-bold text-ink hover:opacity-90 disabled:opacity-50"
            >
              {loading ? t('審查中…', 'Screening…') : t('執行出金審查', 'Run screening')}
            </button>
          </div>
        </div>
      </Panel>

      {error && <ErrorNotice message={error} action={{ label: t('重試', 'Retry'), onClick: () => run() }} />}

      {offline && (
        <ErrorNotice
          message={t(
            '目前顯示的是內建離線快照（案例金額固定為 500,000 USDT，與上方輸入的申請金額無關），非即時查詢結果。',
            'You are seeing the built-in offline snapshot (the amount is fixed at 500,000 USDT regardless of the input above), not a live result.',
          )}
        />
      )}

      {!shown && !error && !loading && (
        <div className="border border-dashed border-line-strong p-8 text-muted">
          <p className="text-lg font-bold text-text">{t('按「執行出金審查」，約 1 秒出結果', 'Press "Run screening" — results in about a second')}</p>
          <p className="mt-2 text-sm leading-relaxed">
            {t(
              '依序看到：決策卡（規則引擎｜GNN 模型｜處置）→ 金流圖 → 證據鏈 → STR 草稿。',
              "You'll see, in order: the decision card (rule engine | GNN model | decision) → fund-flow graph → evidence chain → STR draft.",
            )}
          </p>
        </div>
      )}

      {loading && !shown && (
        <div className="border border-line bg-surface p-8 text-muted" aria-live="polite">{t('審查中…', 'Screening…')}</div>
      )}

      {shown && (
        <>
          <DecisionCard result={shown} />

          <Panel kicker={t('金流圖', 'Fund-flow graph')} title={t('錢怎麼流到這個地址', 'How the money reached this address')}>
            {FOCUS_LAYOUT_IDS.has(active.id) ? (
              <FocusGraph payload={shown.graph} target={shown.target} highlightPath={shown.highlight_path} />
            ) : (
              <ScenarioGraph payload={shown.graph} target={shown.target} highlightPath={shown.highlight_path} />
            )}
          </Panel>

          {shown.associations.length > 0 && (
            <Panel
              kicker={t('規則引擎', 'Rule engine')}
              title={t(`資金關聯證據鏈（共 ${shown.associations.length} 條）`, `Fund-flow evidence chain (${shown.associations.length} links)`)}
              actions={
                shown.associations.length > EVIDENCE_PREVIEW && (
                  <button
                    type="button"
                    onClick={() => setShowAllEvidence((value) => !value)}
                    aria-expanded={showAllEvidence}
                    className="border border-line-strong px-3 py-1 text-sm hover:bg-surface-2"
                  >
                    {showAllEvidence ? t('只看最接近的幾條', 'Show nearest only') : t('顯示全部', 'Show all')}
                  </button>
                )
              }
            >
              <ul className="grid gap-x-10 gap-y-4 text-sm md:grid-cols-2">
                {(showAllEvidence ? shown.associations : shown.associations.slice(0, EVIDENCE_PREVIEW)).map((association) => (
                  <li key={association.risky_node} className="border-l-2 border-signal pl-4">
                    <div className="tabular">
                      {association.risky_node}
                      <span className="ml-2 text-muted">{t(`${association.distance} 階關聯`, `${association.distance} hop${association.distance > 1 ? 's' : ''} away`)}</span>
                    </div>
                    <div className="mt-1 text-muted">
                      {t('命中圖樣：', 'Patterns matched: ')}{association.motifs.map((m) => motifText[m] ?? m).join(t('、', ', '))}
                    </div>
                    <div className="tabular mt-1 text-xs text-muted">{association.path.join(' → ')}</div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {strDraft && (
            <section className="paper p-6 md:p-8" aria-labelledby="str-title">
              <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-current/20 pb-3">
                <div>
                  <div className="paper-muted tabular text-xs">STR DRAFT・{shown.target}</div>
                  <h2 id="str-title" className="text-lg font-black">{t('可疑交易申報（STR）草稿', 'Suspicious transaction report (STR) draft')}</h2>
                </div>
                <button type="button" onClick={downloadStr} className="border px-3 py-1 text-sm font-bold">
                  {t('下載草稿（.txt）', 'Download draft (.txt)')}
                </button>
              </header>
              <pre className="whitespace-pre-wrap text-[13px] leading-8">{strDraft}</pre>
            </section>
          )}

          <details className="border border-line bg-surface p-5">
            <summary className="cursor-pointer font-bold">{t('結構證據 JSON（API 原始回傳）', 'Structural evidence JSON (raw API response)')}</summary>
            <pre className="tabular mt-4 max-h-96 overflow-auto text-xs text-muted">
              {JSON.stringify({ evidence: shown.evidence, model: shown.model, counterfactual: shown.counterfactual }, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
