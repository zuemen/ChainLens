import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SCREENING_SNAPSHOT } from '../api/snapshot'
import { MOTIF_ZH } from '../graph/motifs'
import { STAGE, edgePath, layoutReplay } from '../graph/replayLayout'

const CHAPTER_MS = 5200
const LAST = 5

/**
 * 案件重演：用內建劇本（與出金審查頁、API 同一份資料）分六幕演出
 * 「名單比對放行 → 往上游追溯 → 整張洗錢網路浮現 → 風險傳導 → 暫緩出金」。
 * 這是重演不是即時查詢，畫面上明示為合成劇本；即時審查在 /screening。
 */
export function CaseReplay() {
  const result = SCREENING_SNAPSHOT
  const target = result.target
  const layout = useMemo(() => layoutReplay(result.graph, target), [result.graph, target])
  const [chapter, setChapter] = useState(0)
  const [playing, setPlaying] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)

  // 捲到畫面內才開始自動播放；使用者偏好減少動態時不自動播，改由按鈕逐幕前進
  useEffect(() => {
    const element = stageRef.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlaying(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return
    if (chapter >= LAST) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setChapter((current) => current + 1), CHAPTER_MS)
    return () => window.clearTimeout(timer)
  }, [playing, chapter])

  const go = (next: number) => {
    setPlaying(false)
    setChapter(Math.max(0, Math.min(LAST, next)))
  }
  const replay = () => {
    setChapter(0)
    setPlaying(true)
  }

  const counts = useMemo(() => {
    const byRole = (role: string) => result.graph.nodes.filter((node) => node.role === role).length
    const firstHop = [...layout.values()].filter((node) => node.distance === 1).length
    return { victim: byRole('victim'), support: byRole('support'), mule: byRole('mule'), firstHop }
  }, [result.graph.nodes, layout])

  const hub = result.highlight_path[0]
  const hubMotifs = (result.associations.find((item) => item.risky_node === hub)?.motifs ?? []).map(
    (motif) => MOTIF_ZH[motif] ?? motif,
  )
  const pathEdges = new Set(result.highlight_path.slice(0, -1).map((id, index) => `${id}>${result.highlight_path[index + 1]}`))
  const labelOf = new Map(result.graph.nodes.map((node) => [node.id, node.label]))

  const nodeVisible = (id: string) => {
    if (chapter >= 3) return true
    const distance = layout.get(id)?.distance
    return distance !== null && distance !== undefined && distance <= chapter
  }

  const chapters = [
    {
      kicker: '第 1 幕　出金申請',
      title: `50 萬 USDT，要提領到 ${target}`,
      body: '這個地址從未被通報、不在任何黑名單上。名單比對的結果：放行。',
    },
    {
      kicker: '第 2 幕　往上游追 1 階',
      title: '這筆錢，是從哪裡來的？',
      body: `鏈鏡沿資金流反向追溯。直接打款給它的有 ${counts.firstHop} 個地址，同樣沒有任何通報紀錄。`,
    },
    {
      kicker: '第 3 幕　再追 1 階',
      title: '第 2 階：集資主錢包',
      body: `${hub} 同時命中${hubMotifs.join('、')}。它不在黑名單上，是圖樣庫主動掃出來的。`,
    },
    {
      kicker: '第 4 幕　整張網路',
      title: '集資、分層、整合',
      body: `${counts.victim} 位被害人入金到 ${counts.support} 個客服收款地址，歸集到主錢包，拆給 ${counts.mule} 個車手，再經剝洋蔥鏈層層轉手，流向出金地址。`,
    },
    {
      kicker: '第 5 幕　風險傳導',
      title: `自身 ${result.self_score.toFixed(2)}，關聯 ${result.association_score.toFixed(2)}`,
      body: '地址本身幾乎乾淨；但上游 2 階就是集資主錢包，風險沿資金路徑傳導過來。',
    },
    {
      kicker: '第 6 幕　處置',
      title: '暫緩出金，啟動人工審查',
      body: '系統同時產出可疑交易申報（STR）草稿，逐跳列出金額與時間戳。對照組的正常用戶 0.10，放行。',
    },
  ]
  const current = chapters[chapter]

  const point = (id: string) => layout.get(id) as { x: number; y: number }
  // 光點沿風險路徑移動：逐段串接，長邊沿用同一條弧線
  const pathD = result.highlight_path
    .slice(0, -1)
    .map((id, index) => {
      const segment = edgePath(point(id), point(result.highlight_path[index + 1]))
      return index === 0 ? segment : segment.replace(/^M[\d.]+ [\d.]+/, '')
    })
    .join('')

  return (
    <div ref={stageRef} className="on-dark bg-dark text-on-dark">
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-2">
        {/* 旁白在舞台上方：評審第一眼先讀到「現在演到哪」，再看圖 */}
        <div className="grid gap-4 border-t border-dark-line pt-5 md:grid-cols-[1fr_auto] md:items-end">
          <div aria-live="polite" className="md:min-h-[6.5rem]">
            <div className="kicker">{current.kicker}</div>
            <p key={chapter} className="reveal mt-1 font-serif text-2xl font-bold md:text-3xl">{current.title}</p>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-on-dark-muted md:text-base">{current.body}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => go(chapter - 1)} disabled={chapter === 0} className="replay-btn" aria-label="上一幕">←</button>
            <div className="flex gap-2" role="group" aria-label="選擇幕次">
              {chapters.map((item, index) => (
                <button
                  key={item.kicker}
                  type="button"
                  onClick={() => go(index)}
                  aria-label={item.kicker}
                  aria-current={index === chapter ? 'step' : undefined}
                  className={['replay-dot', index === chapter ? 'is-on' : '', index < chapter ? 'is-done' : ''].join(' ')}
                />
              ))}
            </div>
            <button type="button" onClick={() => go(chapter + 1)} disabled={chapter === LAST} className="replay-btn" aria-label="下一幕">→</button>
            <button type="button" onClick={chapter === LAST ? replay : () => setPlaying((value) => !value)} className="replay-btn px-4">
              {chapter === LAST ? '重播' : playing ? '暫停' : '播放'}
            </button>
          </div>
        </div>

        <div className="relative mt-4 border border-dark-line">
          {playing && <div key={chapter} className="replay-progress" style={{ animationDuration: `${CHAPTER_MS}ms` }} aria-hidden="true" />}
          <svg viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} className="replay-stage block h-auto w-full" role="img" aria-label={`案件重演，${current.kicker}：${current.title}。${current.body}`}>
            {/* 三階段欄位標題：整張網路浮現後才出現 */}
            <g className={chapter >= 3 ? 'replay-fade is-on' : 'replay-fade'}>
              <text x="220" y="36" className="replay-phase">集資</text>
              <text x="820" y="36" className="replay-phase">分層</text>
              <text x="1120" y="36" className="replay-phase">整合</text>
              <line x1="40" y1="50" x2="400" y2="50" className="replay-phase-rule" />
              <line x1="490" y1="50" x2="1030" y2="50" className="replay-phase-rule" />
              <line x1="1070" y1="50" x2="1170" y2="50" className="replay-phase-rule" />
              <text x="590" y="478" className="replay-note">與本案無關的正常交易</text>
            </g>

            {result.graph.edges.map((edge) => {
              const visible = nodeVisible(edge.source) && nodeVisible(edge.target)
              const onPath = pathEdges.has(`${edge.source}>${edge.target}`)
              return (
                <path
                  key={`${edge.source}>${edge.target}`}
                  d={edgePath(point(edge.source), point(edge.target))}
                  pathLength={1}
                  // 追溯階段（前三幕）線條從出金目標往上游長出來；之後順著資金流向
                  className={['replay-edge', chapter < 3 ? 'is-upstream' : '', visible ? 'is-on' : '', onPath && chapter >= 4 ? 'is-path' : ''].join(' ')}
                />
              )
            })}

            {chapter >= 4 && (
              <circle r="7" className="replay-coin">
                <animateMotion dur="2.6s" repeatCount="indefinite" path={pathD} />
              </circle>
            )}

            {result.graph.nodes.map((node) => {
              const { x, y, role } = layout.get(node.id) as { x: number; y: number; role: string }
              const isTarget = node.id === target
              const isHub = node.id === hub
              const risky = labelOf.get(node.id) === 'high' && (chapter >= 3 || (isHub && chapter >= 2))
              const radius = isHub ? 22 : isTarget ? 16 : role === 'peel_side' ? 5 : role === 'victim' || role === 'normal' ? 8 : 11
              const tone = isTarget ? 'is-target' : risky ? 'is-risky' : role === 'victim' && chapter >= 3 ? 'is-victim' : ''
              return (
                <circle
                  key={node.id}
                  cx={x}
                  cy={y}
                  r={radius}
                  style={{ transformOrigin: `${x}px ${y}px` }}
                  className={['replay-node', nodeVisible(node.id) ? 'is-on' : '', tone].join(' ')}
                />
              )
            })}

            {/* 關鍵節點標籤 */}
            <g className="replay-label">
              <text x={point(target).x} y={point(target).y + 40} textAnchor="middle" className="is-strong">出金目標</text>
              <text x={point(target).x} y={point(target).y + 60} textAnchor="middle">{target}</text>
              <g className={chapter >= 2 ? 'replay-fade is-on' : 'replay-fade'}>
                <text x={point(hub).x} y={point(hub).y - 34} textAnchor="middle" className="is-strong">集資主錢包</text>
              </g>
              <g className={chapter >= 3 ? 'replay-fade is-on' : 'replay-fade'}>
                <text x="70" y="74" textAnchor="middle">被害人 ×{counts.victim}</text>
                <text x="220" y="74" textAnchor="middle">客服收款 ×{counts.support}</text>
                <text x="520" y="74" textAnchor="middle">車手 ×{counts.mule}</text>
                <text x="820" y="74" textAnchor="middle">剝洋蔥鏈</text>
              </g>
            </g>

            {/* 第 1 幕：名單比對的結論 */}
            <g className={chapter === 0 ? 'replay-fade is-on' : 'replay-fade'}>
              <rect x={point(target).x - 250} y={point(target).y - 112} width="230" height="58" className="replay-stamp-box is-pass" />
              <text x={point(target).x - 135} y={point(target).y - 75} textAnchor="middle" className="replay-stamp is-pass">名單比對：放行</text>
            </g>
            {/* 第 6 幕：鏈鏡的結論 */}
            <g className={chapter === LAST ? 'replay-fade is-on' : 'replay-fade'}>
              <rect x={point(target).x - 250} y={point(target).y - 112} width="230" height="58" className="replay-stamp-box is-block" />
              <text x={point(target).x - 135} y={point(target).y - 75} textAnchor="middle" className="replay-stamp is-block">鏈鏡：暫緩出金</text>
            </g>
          </svg>

          {/* 風險算式：第 5 幕起出現（桌機疊在舞台左下，手機排在舞台下方） */}
          <div className={['replay-score', chapter >= 4 ? 'is-on' : ''].join(' ')} aria-hidden={chapter < 4}>
            <div>
              <div className="text-xs text-on-dark-muted">自身結構</div>
              <div className="font-serif text-3xl font-black md:text-4xl">{result.self_score.toFixed(2)}</div>
            </div>
            <div className="tabular text-2xl text-on-dark-muted">⊕</div>
            <div>
              <div className="text-xs text-on-dark-muted">資金關聯</div>
              <div className="font-serif text-3xl font-black md:text-4xl">{result.association_score.toFixed(2)}</div>
            </div>
            <div className="tabular text-2xl text-on-dark-muted">=</div>
            <div>
              <div className="text-xs text-on-dark-muted">綜合風險（≥0.7 暫緩）</div>
              <div className="font-serif text-4xl font-black text-signal md:text-5xl">{result.risk_score.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link to="/screening?auto=1" className="bg-signal px-6 py-3 font-bold text-dark hover:bg-on-dark">
            親手執行一次即時審查
          </Link>
          <Link to="/workbench" className="border border-on-dark-muted px-6 py-3 hover:border-on-dark">
            打開金流圖譜工作台
          </Link>
          <span className="tabular ml-auto text-xs text-on-dark-muted">案件重演・合成劇本資料（與 API 回傳同一份）</span>
        </div>
      </div>
    </div>
  )
}
