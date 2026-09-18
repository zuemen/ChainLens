import { useCallback, useEffect, useState } from 'react'
import { ApiError, postGraph } from '../api/client'
import type { GraphNode, WorkbenchPayload } from '../api/types'
import { ErrorNotice } from '../components/ErrorNotice'
import { Panel } from '../components/Panel'
import { GraphView } from '../graph/GraphView'
import { ScenarioGraph } from '../graph/ScenarioGraph'

const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/

type GraphSource = { kind: 'scenario' } | { kind: 'tron'; address: string }

function sourceLabel(source: GraphSource | null): string {
  if (!source) return ''
  return source.kind === 'tron' ? `TRON 即時：${source.address}` : '出金審查劇本圖'
}

export default function Workbench() {
  const [address, setAddress] = useState('')
  const [payload, setPayload] = useState<WorkbenchPayload | null>(null)
  // 目前畫面上這張圖的來源；只在成功查詢後更新，失敗時維持不變
  const [source, setSource] = useState<GraphSource | null>(null)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function load(mode: 'scenario' | 'tron') {
    setLoading(true)
    setError(null)
    try {
      const next = await postGraph(mode === 'tron' ? { mode, address } : { mode })
      setPayload(next)
      setSource(mode === 'tron' ? { kind: 'tron', address } : { kind: 'scenario' })
      setSelected(null)
    } catch (err) {
      // 503＝伺服器未設定金鑰，即時鏈上查詢依設計停用（保護第三方 API 額度）
      if (err instanceof ApiError && err.status === 503) {
        setError('公開 Demo 站為保護第三方 API 額度，已停用即時鏈上查詢；劇本圖可完整操作。自行部署並設定金鑰後即可查詢真實地址。')
      } else {
        setError(err instanceof ApiError ? err.detail : '載入失敗，請稍後再試。')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load('scenario')
    // 只在首次掛載時載入劇本圖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelect = useCallback(
    (id: string) => setSelected(payload?.nodes.find((node) => node.id === id) ?? null),
    [payload],
  )

  const addressValid = TRON_ADDRESS.test(address)

  return (
    <div className="space-y-5">
      <header className="border-b border-line pb-5">
        <div className="kicker">金流圖譜</div>
        <h1 className="mt-1 text-3xl font-black leading-tight md:text-4xl">金流圖譜工作台</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          預設載入與首頁、出金審查同一份劇本圖，點任一節點看該地址的風險證據。
          本機部署並設定金鑰後可輸入 TRON 主網地址即時抓取 2 階 USDT 金流圖（約 10–30 秒）；公開 Demo 站停用即時查詢。
        </p>
      </header>

      <Panel>
        <div className="grid gap-4 md:grid-cols-[3fr_auto_auto] md:items-end">
          <label className="block">
            <span className="text-xs text-muted">TRON 地址（TRC-20 USDT）</span>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value.trim())}
              placeholder="T 開頭主網地址，34 字元"
              className="tabular mt-1 w-full border p-2.5"
            />
            {address && !addressValid && (
              <span className="mt-1 block text-xs text-review">
                地址格式不正確：需為 T 開頭的 Base58 主網地址（34 字元）。
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={() => load('tron')}
            disabled={!addressValid || loading}
            className="bg-signal px-6 py-2.5 font-bold text-ink hover:opacity-90 disabled:opacity-40"
          >
            {loading ? '查詢中…' : '抓取真實金流'}
          </button>

          <button
            type="button"
            onClick={() => load('scenario')}
            disabled={loading}
            className="border border-line-strong px-5 py-2.5 hover:bg-surface-2"
          >
            載入劇本圖
          </button>
        </div>
      </Panel>

      {error && <ErrorNotice message={error} action={{ label: '回到劇本圖', onClick: () => load('scenario') }} />}

      {payload && (
        <>
          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <Panel
              kicker={sourceLabel(source)}
              title={`金流圖譜（${payload.meta.node_count} 節點 / ${payload.meta.edge_count} 邊）`}
            >
              {/* 劇本圖有角色標註：用依洗錢三階段分欄的靜態圖；真實鏈上圖沒有角色，才用力導向排版 */}
              {source?.kind === 'tron' ? (
                <GraphView payload={payload} layout="cose" scheme="risk" onSelect={handleSelect} />
              ) : (
                <ScenarioGraph payload={payload} selected={selected?.id ?? null} onSelect={handleSelect} />
              )}
              {payload.meta.truncated && (
                <p className="mt-3 text-xs text-review">
                  圖譜顯示風險最高的 {payload.meta.node_count} 個節點（原始共 {payload.meta.total_node_count} 個）。
                  下方鄰接表僅列出這 {payload.meta.node_count} 個節點之間的連線。
                </p>
              )}
            </Panel>

            <Panel kicker="節點" title="風險證據">
              {selected ? (
                <div className="space-y-3">
                  <div className="tabular text-sm">{selected.id}</div>
                  <div className="text-sm text-muted">{selected.role_zh}</div>
                  <div className="big-num text-5xl">{selected.score.toFixed(2)}</div>
                  <p className="text-sm leading-relaxed text-muted">{selected.narrative_zh}</p>
                </div>
              ) : (
                <p className="text-sm text-muted">尚未選取節點。</p>
              )}
            </Panel>
          </div>

          <Panel kicker="文字替代" title="資金流向明細（鄰接表）">
            <div className="max-h-80 overflow-auto">
              <table className="tabular w-full text-left text-xs">
                <caption className="sr-only">金流圖譜的鄰接表，欄位為來源地址、目標地址與轉帳金額</caption>
                <thead className="sticky top-0 bg-surface text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-normal">來源</th>
                    <th scope="col" className="py-2 pr-4 font-normal">目標</th>
                    <th scope="col" className="py-2 pr-4 font-normal">金額（USDT）</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.edges.map((edge) => (
                    <tr key={`${edge.source}->${edge.target}`} className="border-t border-line">
                      <td className="py-2 pr-4">{edge.source}</td>
                      <td className="py-2 pr-4">{edge.target}</td>
                      <td className="py-2 pr-4">{edge.amount.toLocaleString('zh-TW')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel kicker="SNA" title="SNA 指標（依風險分數排序前 15 名）">
            <div className="overflow-x-auto">
              <table className="tabular w-full text-left text-xs">
                <thead className="text-muted">
                  <tr>
                    {['地址', 'in', 'out', 'PageRank', 'k-core', 'betweenness', '分數'].map((head) => (
                      <th key={head} className="py-2 pr-4 font-normal">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payload.sna.map((row) => (
                    <tr key={row.node} className="border-t border-line">
                      <td className="py-2 pr-4">{row.node}</td>
                      <td className="py-2 pr-4">{row.in_degree.toFixed(0)}</td>
                      <td className="py-2 pr-4">{row.out_degree.toFixed(0)}</td>
                      <td className="py-2 pr-4">{row.pagerank.toFixed(4)}</td>
                      <td className="py-2 pr-4">{row.kcore.toFixed(0)}</td>
                      <td className="py-2 pr-4">{row.betweenness.toFixed(4)}</td>
                      <td className="py-2 pr-4">{row.score.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
