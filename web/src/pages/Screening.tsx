import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, postScreen } from '../api/client'
import { SCREENING_SNAPSHOT } from '../api/snapshot'
import type { ScreenResult } from '../api/types'
import { DecisionCard } from '../components/DecisionCard'
import { ErrorNotice } from '../components/ErrorNotice'
import { Panel } from '../components/Panel'
import { MOTIF_ZH } from '../graph/motifs'
import { ScenarioGraph } from '../graph/ScenarioGraph'

/** 證據鏈預設只列最接近的幾條，其餘收合，讓 STR 草稿不必捲很久才看得到 */
const EVIDENCE_PREVIEW = 4

/**
 * 五個示範情境（與後端 scenario.SCREEN_TARGETS 對應），涵蓋暫緩／加強審查／放行三級處置。
 * lesson 是給評審的一句話重點；實際分數與決策一律以 API 回傳為準，不寫死在這裡。
 */
export const CASES = [
  {
    value: 'TOtcOut01',
    tag: '情境一',
    title: '乾淨的地址，髒的上游',
    story: '用戶申請把 50 萬 USDT 提領到一個從未被通報、不在任何黑名單上的地址。',
    lesson: '名單比對會放行；鏈鏡沿資金路徑追溯，發現上游 2 階就是命中三種洗錢圖樣的集資主錢包。',
    painPoint: '對應痛點：黑名單永遠慢一步、金檢要求評估提幣資金流向',
  },
  {
    value: 'TDownstream01',
    tag: '情境二',
    title: '贓款再轉一手',
    story: '上述地址事後又把款項轉給一個全新地址，用戶要提領到這個新地址。',
    lesson: '距離集資主錢包 3 階，關聯風險衰減為 0.36：不直接攔阻，改列「加強審查」交由法遵人員判斷。',
    painPoint: '對應痛點：單一固定門檻無法分級處置',
  },
  {
    value: 'TMule03',
    tag: '情境三',
    title: '車手地址直接出金',
    story: '剛收到集資主錢包拆款的車手地址，直接申請出金。',
    lesson: '這個地址本身就在「快速分散」圖樣的下游，自身結構分數即達高風險，不必等任何人通報。',
    painPoint: '對應痛點：詐騙地址用過即丟，來不及被通報',
  },
  {
    value: 'TVictim01',
    tag: '情境四',
    title: '被害人不連坐',
    story: '曾匯款給詐騙客服地址的被害人，要提領自己的其他資產。',
    lesson: '資金來源方不加風險分。被害人雖與詐騙地址有往來，仍判為低風險放行。',
    painPoint: '對應痛點：寧可錯殺的風控會傷害被害人與正常用戶',
  },
  {
    value: 'TNormalUser01',
    tag: '情境五',
    title: '正常用戶',
    story: '只與一般商家往來的用戶申請出金。',
    lesson: '追溯 4 階內沒有任何命中洗錢圖樣的節點，放行。',
    painPoint: '對照組：同一套引擎、同樣 50 萬 USDT，結果完全不同',
  },
] as const

type CaseValue = (typeof CASES)[number]['value']

export default function Screening() {
  const [target, setTarget] = useState<CaseValue>(CASES[0].value)
  const [amount, setAmount] = useState(500000)
  const [result, setResult] = useState<ScreenResult | null>(null)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAllEvidence, setShowAllEvidence] = useState(false)
  const [searchParams] = useSearchParams()
  const activeCase = CASES.find((item) => item.value === target) ?? CASES[0]

  async function run(nextTarget: CaseValue = target) {
    setLoading(true)
    setError(null)
    try {
      setResult(await postScreen(nextTarget, amount))
      setOffline(false)
    } catch (err) {
      // 完全無法連線（斷網/DNS/CORS）或後端本身出錯（5xx，含 Vercel 冷啟動逾時）時
      // 退回內建快照，讓現場演示不中斷；畫面會明確標示為離線快照。
      // 4xx（例如 VITE_API_BASE 設錯導致的 404/405）不算——那是設定問題，
      // 假裝查詢成功反而會掩蓋它。
      if (
        err instanceof ApiError &&
        (err.status === 0 || err.status >= 500) &&
        nextTarget === 'TOtcOut01'
      ) {
        setResult(SCREENING_SNAPSHOT)
        setOffline(true)
      } else {
        // 清掉上一次的結果，避免畫面同時顯示錯誤條與舊的（且可能是別的目標地址的）決策卡。
        setResult(null)
        setOffline(false)
        setError(err instanceof ApiError ? err.detail : '審查失敗，請稍後再試。')
      }
    } finally {
      setLoading(false)
    }
  }

  // 從首頁「親手執行一次」進來時（?auto=1）直接跑一次，評審不必再找按鈕
  useEffect(() => {
    if (searchParams.get('auto') === '1') void run()
    // 只在進頁時觸發一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 點情境卡即切換並直接審查：評審一路點下去就能看完五個情境
  function pick(next: CaseValue) {
    setTarget(next)
    setShowAllEvidence(false)
    void run(next)
  }

  function downloadStr() {
    if (!result?.str_draft_zh) return
    const url = URL.createObjectURL(new Blob([result.str_draft_zh], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `STR_draft_${result.target}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const shownResult = result && result.target === target ? result : null

  return (
    <div className="space-y-6">
      <header className="border-b border-line pb-6">
        <div className="kicker">即時出金審查</div>
        <h1 className="mt-2 text-4xl font-black leading-tight text-brand">出金審查</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted">
          同一套引擎、同樣 50 萬 USDT 的出金申請，五個情境得到三種處置。點任一情境，約 1 秒看到即時審查結果。
        </p>
      </header>

      <div role="radiogroup" aria-label="選擇示範情境" className="grid gap-3 md:grid-cols-5">
        {CASES.map((item) => {
          const checked = item.value === target
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => pick(item.value)}
              className={`flex flex-col border p-4 text-left ${checked ? 'border-brand bg-brand text-white' : 'border-line bg-panel hover:border-brand'}`}
            >
              <span className={`text-sm font-bold ${checked ? 'text-gold-on-dark' : 'text-gold'}`}>{item.tag}</span>
              <span className="mt-1 font-serif text-lg font-bold leading-snug">{item.title}</span>
              <span className={`tabular mt-2 text-xs ${checked ? 'text-on-dark-muted' : 'text-muted'}`}>{item.value}</span>
            </button>
          )
        })}
      </div>

      <Panel>
        <p className="text-lg leading-relaxed">
          <strong className="text-brand">{activeCase.tag}　{activeCase.title}：</strong>
          {activeCase.story}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block max-w-xs">
            <span className="text-xs text-muted">申請金額（USDT）</span>
            <input
              type="number"
              min={1}
              step={10000}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="tabular mt-1 w-full border border-line bg-panel-raised p-2.5"
            />
          </label>
          <button
            type="button"
            onClick={() => run()}
            disabled={loading}
            className="bg-brand px-6 py-2.5 font-bold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {loading ? '審查中…' : '執行出金審查'}
          </button>
        </div>
      </Panel>

      {error && <ErrorNotice message={error} action={{ label: '重試', onClick: () => run() }} />}

      {offline && (
        <ErrorNotice message="目前顯示的是內建離線快照（案例金額固定為 500,000 USDT，與上方輸入的申請金額無關），非即時查詢結果。" />
      )}

      {!shownResult && !error && !loading && (
        <div className="border border-dashed border-line-strong p-8 text-muted">
          <p className="font-serif text-xl font-bold text-ink">按「執行出金審查」，約 1 秒出結果</p>
          <p className="mt-2 leading-relaxed">
            會依序看到：審查決策與三個分數 → 金流圖與風險資金路徑 → 資金關聯證據鏈 → 可疑交易申報（STR）草稿。
          </p>
        </div>
      )}

      {shownResult && (
        <>
          <DecisionCard result={shownResult} />

          <div className="border-l-4 border-gold bg-panel p-5">
            <div className="text-sm font-bold text-gold">這個情境說明什麼</div>
            <p className="mt-1 text-lg leading-relaxed">{activeCase.lesson}</p>
            <p className="mt-2 text-sm text-muted">{activeCase.painPoint}</p>
          </div>

          <Panel title="金流圖：錢怎麼流到這個地址">
            <ScenarioGraph payload={shownResult.graph} target={shownResult.target} highlightPath={shownResult.highlight_path} />
          </Panel>

          {shownResult.associations.length > 0 && (
            <Panel
              title={`資金關聯證據鏈（共 ${shownResult.associations.length} 條）`}
              actions={
                shownResult.associations.length > EVIDENCE_PREVIEW && (
                  <button
                    type="button"
                    onClick={() => setShowAllEvidence((value) => !value)}
                    aria-expanded={showAllEvidence}
                    className="border border-line-strong px-3 py-1 text-sm hover:bg-panel-raised"
                  >
                    {showAllEvidence ? '只看最接近的幾條' : '顯示全部'}
                  </button>
                )
              }
            >
              <ul className="grid gap-x-10 gap-y-4 text-sm md:grid-cols-2">
                {(showAllEvidence ? shownResult.associations : shownResult.associations.slice(0, EVIDENCE_PREVIEW)).map((association) => (
                  <li key={association.risky_node} className="border-l-2 border-line pl-4">
                    <div className="tabular">
                      {association.risky_node}
                      <span className="ml-2 text-muted">{association.distance} 階關聯</span>
                    </div>
                    <div className="mt-1 text-muted">
                      命中圖樣：
                      {association.motifs.map((m) => MOTIF_ZH[m] ?? m).join('、')}
                    </div>
                    <div className="tabular mt-1 text-xs text-muted">
                      {association.path.join(' → ')}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {shownResult.str_draft_zh && (
            <Panel
              title="可疑交易申報（STR）草稿"
              actions={
                <button
                  type="button"
                  onClick={downloadStr}
                  className="border border-line-strong px-3 py-1 text-sm hover:bg-panel-raised"
                >
                  下載草稿（.txt）
                </button>
              }
            >
              <pre className="tabular whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {shownResult.str_draft_zh}
              </pre>
            </Panel>
          )}

          <details className="border border-line bg-panel p-6">
            <summary className="cursor-pointer font-serif text-lg font-bold">結構證據 JSON（API 原始回傳）</summary>
            <pre className="tabular mt-4 max-h-96 overflow-auto text-xs text-muted">
              {JSON.stringify(shownResult.evidence, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
