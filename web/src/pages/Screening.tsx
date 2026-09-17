import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, postScreen } from '../api/client'
import { SCREENING_SNAPSHOT } from '../api/snapshot'
import type { ScreenResult } from '../api/types'
import { DecisionCard } from '../components/DecisionCard'
import { ErrorNotice } from '../components/ErrorNotice'
import { Panel } from '../components/Panel'
import { GraphView } from '../graph/GraphView'
import { MOTIF_ZH } from '../graph/motifs'

/** 證據鏈預設只列最接近的幾條，其餘收合，讓圖譜與 STR 草稿不必捲很久才看得到 */
const EVIDENCE_PREVIEW = 4

const TARGETS = [
  { value: 'TOtcOut01', label: 'TOtcOut01（本案：未通報之 OTC 收款地址）' },
  { value: 'TNormalUser01', label: 'TNormalUser01（對照組：正常用戶地址）' },
]

export default function Screening() {
  const [target, setTarget] = useState(TARGETS[0].value)
  const [amount, setAmount] = useState(500000)
  const [result, setResult] = useState<ScreenResult | null>(null)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAllEvidence, setShowAllEvidence] = useState(false)
  const [searchParams] = useSearchParams()

  async function run() {
    setLoading(true)
    setError(null)
    try {
      setResult(await postScreen(target, amount))
      setOffline(false)
    } catch (err) {
      // 完全無法連線（斷網/DNS/CORS）或後端本身出錯（5xx，含 Vercel 冷啟動逾時）時
      // 退回內建快照，讓現場演示不中斷；畫面會明確標示為離線快照。
      // 4xx（例如 VITE_API_BASE 設錯導致的 404/405）不算——那是設定問題，
      // 假裝查詢成功反而會掩蓋它。
      if (
        err instanceof ApiError &&
        (err.status === 0 || err.status >= 500) &&
        target === 'TOtcOut01'
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

  function downloadStr() {
    if (!result?.str_draft_zh) return
    const url = URL.createObjectURL(new Blob([result.str_draft_zh], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `STR_draft_${result.target}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black leading-tight">出金審查</h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-muted">
          {target === 'TOtcOut01'
            ? '交易所用戶申請將 50 萬 USDT 提領至外部地址。該地址從未被通報、不在任何黑名單上，名單比對會直接放行。以下是鏈鏡的即時審查結果。'
            : '對照組：同一套引擎審查一個只與一般商家往來的正常用戶地址，確認不會被誤攔。'}
        </p>
      </div>

      <Panel>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="text-xs text-muted">出金目標地址</span>
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="tabular mt-1 w-full border border-line bg-panel-raised p-2.5"
            >
              {TARGETS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
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
            onClick={run}
            disabled={loading}
            className="bg-brand px-6 py-2.5 font-bold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {loading ? '審查中…' : '執行出金審查'}
          </button>
        </div>
      </Panel>

      {error && <ErrorNotice message={error} action={{ label: '重試', onClick: run }} />}

      {offline && (
        <ErrorNotice message="目前顯示的是內建離線快照（案例金額固定為 500,000 USDT，與上方輸入的申請金額無關），非即時查詢結果。" />
      )}

      {!result && !error && !loading && (
        <div className="border border-dashed border-line-strong p-8 text-muted">
          <p className="font-serif text-xl font-bold text-ink">按「執行出金審查」，約 1 秒出結果</p>
          <p className="mt-2 leading-relaxed">
            會依序看到：審查決策與三個分數 → 金流圖譜與風險資金路徑 → 資金關聯證據鏈 → 可疑交易申報（STR）草稿。
          </p>
        </div>
      )}

      {result && (
        <>
          <DecisionCard result={result} />

          <Panel title="金流圖譜">
            <GraphView
              payload={result.graph}
              highlightPath={result.highlight_path}
              focus={result.target}
              layout="dagre"
              scheme="role"
            />
          </Panel>

          {result.associations.length > 0 && (
            <Panel
              title={`資金關聯證據鏈（共 ${result.associations.length} 條）`}
              actions={
                result.associations.length > EVIDENCE_PREVIEW && (
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
                {(showAllEvidence ? result.associations : result.associations.slice(0, EVIDENCE_PREVIEW)).map((association) => (
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

          {result.str_draft_zh && (
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
                {result.str_draft_zh}
              </pre>
            </Panel>
          )}

          <details className="border border-line bg-panel p-6">
            <summary className="cursor-pointer font-serif text-lg font-bold">結構證據 JSON（API 原始回傳）</summary>
            <pre className="tabular mt-4 max-h-96 overflow-auto text-xs text-muted">
              {JSON.stringify(result.evidence, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
