import { useMemo, useState } from 'react'
import type { GraphNode, GraphPayload } from '../api/types'
import { ENTITY_ROLES, ROLE_ZH } from '../content/scenarios'
import { layoutFocus, type FocusNode } from './focusLayout'
import { STAGE } from './replayLayout'

/**
 * 焦點金流圖（情境 6～8）：目標在中間偏右，上游一階一欄往左排，同批收款地址與目標同欄。
 * 一定要看得懂錢往哪流：每條邊帶箭頭、風險路徑用訊號色、目標的匯入邊標金額。
 */
export function FocusGraph({
  payload,
  target,
  highlightPath = [],
}: {
  payload: GraphPayload
  target: string
  highlightPath?: string[]
}) {
  const layout = useMemo(() => layoutFocus(payload, target), [payload, target])
  const [hover, setHover] = useState<GraphNode | null>(null)
  const nodeById = useMemo(() => new Map(payload.nodes.map((node) => [node.id, node])), [payload.nodes])
  const pathEdges = new Set(highlightPath.slice(0, -1).map((id, index) => `${id}>${highlightPath[index + 1]}`))
  const point = (id: string) => layout.nodes.get(id) as FocusNode

  const edges = payload.edges.filter((edge) => layout.nodes.has(edge.source) && layout.nodes.has(edge.target))
  const incomingToTarget = edges.filter((edge) => edge.target === target)
  const sameAmount = incomingToTarget.length > 1 && incomingToTarget.every((edge) => edge.amount === incomingToTarget[0].amount)
  const incomingSummary =
    incomingToTarget.length === 0
      ? null
      : sameAmount
        ? `${incomingToTarget.length} 筆匯入 × ${incomingToTarget[0].amount.toLocaleString('en-US')} USDT`
        : incomingToTarget.length === 1
          ? `匯入 ${incomingToTarget[0].amount.toLocaleString('en-US')} USDT`
          : `${incomingToTarget.length} 筆匯入，合計 ${incomingToTarget.reduce((sum, edge) => sum + edge.amount, 0).toLocaleString('en-US')} USDT`

  // 匯入摘要要放目標右側還是下方：估字寬（CJK 17px、其餘 10.5px），右邊放不下就放下方
  const summaryWidth = [...(incomingSummary ?? '')].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 17 : 10.5), 0)
  const summaryFitsRight = layout.nodes.has(target) && point(target).x + 62 + summaryWidth < STAGE.width - 16

  // 欄位標題：該欄最多的角色 × 數量
  const heads = layout.columns.map((column) => {
    const members = [...layout.nodes.values()].filter((node) => node.column === column && node.id !== target)
    if (members.length === 0) return { column, x: 0, label: '' }
    const count = new Map<string, number>()
    for (const member of members) count.set(member.role, (count.get(member.role) ?? 0) + 1)
    // 最多列兩種角色，例如「車手 ×1、剝洋蔥中繼 ×2」
    const parts = [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([role, n]) => `${(ROLE_ZH[role] ?? role).replace('（已標註實體）', '')}${n > 1 ? ` ×${n}` : ''}`)
    const xs = members.map((member) => member.x)
    const x = (Math.min(...xs) + Math.max(...xs)) / 2
    const label = column === 0 ? `同批收款 ×${members.length}` : parts.join('、')
    return { column, x, label }
  })

  const radiusOf = (node: FocusNode) => {
    if (node.id === target) return 18
    if (ENTITY_ROLES.has(node.role) || node.role === 'aggregator') return 22
    if (node.kind === 'sibling') return 8
    return 12
  }
  const toneOf = (node: FocusNode) => {
    if (node.id === target) return 'is-target'
    const info = nodeById.get(node.id)
    if (info?.label === 'high') return 'is-risky'
    if (node.role === 'victim') return 'is-victim'
    return ''
  }

  return (
    <figure>
      <div className="graph-scroll relative border border-line">
        <svg
          viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
          className="replay-stage block h-auto w-full"
          data-testid="graph-view"
          role="img"
          aria-label={`金流圖：以審查目標 ${target} 為中心，上游在左、資金由左往右流；訊號色粗線為風險資金路徑。${incomingSummary ?? ''}`}
        >
          <defs>
            <marker id="focus-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="var(--color-edge)" />
            </marker>
            <marker id="focus-arrow-path" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="var(--color-signal)" />
            </marker>
          </defs>

          <text x="40" y="40" className="replay-note">資金流向 →</text>
          <g className="replay-label">
            {heads.map((head) => head.label && (
              <text key={head.column} x={head.x} y="76" textAnchor="middle">{head.label}</text>
            ))}
          </g>

          {edges.map((edge) => {
            const from = point(edge.source)
            const to = point(edge.target)
            const onPath = pathEdges.has(`${edge.source}>${edge.target}`)
            // 終點縮回節點半徑，箭頭才不會被圓蓋住
            const dx = to.x - from.x
            const dy = to.y - from.y
            const length = Math.hypot(dx, dy) || 1
            const r = radiusOf(to) + 4
            const endX = to.x - (dx / length) * r
            const endY = to.y - (dy / length) * r
            return (
              <path
                key={`${edge.source}>${edge.target}`}
                d={`M${from.x} ${from.y}L${endX} ${endY}`}
                pathLength={1}
                markerEnd={onPath ? 'url(#focus-arrow-path)' : 'url(#focus-arrow)'}
                className={['replay-edge is-on', onPath ? 'is-path' : ''].join(' ')}
              />
            )
          })}

          {[...layout.nodes.values()].map((node) => {
            const info = nodeById.get(node.id)
            const radius = radiusOf(node)
            const entity = ENTITY_ROLES.has(node.role)
            return (
              <g key={node.id}>
                {node.id === target && <circle cx={node.x} cy={node.y} r={radius + 9} className="graph-halo" />}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  className={['replay-node is-on', toneOf(node), entity ? 'is-entity' : ''].join(' ')}
                  onPointerEnter={() => info && setHover(info)}
                  onPointerLeave={() => setHover(null)}
                >
                  <title>{`${node.id}｜${info?.role_zh ?? node.role}｜自身結構分數 ${(info?.score ?? 0).toFixed(2)}`}</title>
                </circle>
              </g>
            )
          })}

          <g className="replay-label">
            {layout.nodes.has(target) && (
              <>
                <text x={point(target).x} y={point(target).y - 30} textAnchor="middle" className="is-strong">審查目標</text>
                {incomingSummary && (summaryFitsRight ? (
                  // 右側放得下（情境 8：目標欄不在最右邊）就放右側，不壓到同批收款地址的連線
                  <text x={point(target).x + 62} y={point(target).y + 7} textAnchor="start" className="is-mono">{incomingSummary}</text>
                ) : (
                  <text x={point(target).x} y={point(target).y + 46} textAnchor="middle" className="is-mono">{incomingSummary}</text>
                ))}
              </>
            )}
            {[...layout.nodes.values()]
              .filter((node) => ENTITY_ROLES.has(node.role))
              .map((node) => (
                <text key={node.id} x={node.x} y={node.y - 34} textAnchor="middle" className="is-model">已標註實體</text>
              ))}
            {[...layout.nodes.values()]
              .filter((node) => node.role === 'aggregator')
              .map((node) => (
                <text key={node.id} x={node.x} y={node.y - 34} textAnchor="middle" className="is-strong">集資主錢包</text>
              ))}
            {layout.hidden > 0 && (
              <text x={STAGE.width - 40} y={STAGE.height - 24} textAnchor="end" className="replay-note">
                另 {layout.hidden} 個地址與目標 4 階內無資金關聯，未畫出
              </text>
            )}
          </g>
        </svg>

        {hover && (
          <div className="graph-tip" role="status">
            <div className="tabular font-bold">{hover.id}</div>
            <div>{hover.role_zh}</div>
            <div>
              自身結構分數 <span className="tabular font-bold">{hover.score.toFixed(2)}</span>
              {hover.is_motif_center && '　命中洗錢圖樣'}
            </div>
          </div>
        )}
      </div>
      <GraphLegend hasPath={highlightPath.length > 0} hasEntity={payload.nodes.some((node) => ENTITY_ROLES.has(node.role))} />
    </figure>
  )
}

export function GraphLegend({ hasPath, hasEntity }: { hasPath: boolean; hasEntity: boolean }) {
  return (
    <figcaption>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        {hasPath && (
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-1 w-7 bg-signal" />
            流向審查目標的風險資金路徑
          </li>
        )}
        <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-full border-[3px] border-text bg-ink" />審查目標</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-signal" />高風險地址</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-node-victim" />被害人</li>
        {hasEntity && (
          <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-full border-[3px] border-model bg-node-other" />已標註實體</li>
        )}
        <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-node-other" />其他地址</li>
        <li>滑鼠移到節點上可看地址與分數</li>
      </ul>
    </figcaption>
  )
}
