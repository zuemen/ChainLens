import { useMemo, useState } from 'react'
import type { GraphNode, GraphPayload } from '../api/types'
import { ENTITY_ROLES } from '../content/scenarios'
import { GraphLegend } from './FocusGraph'
import { STAGE, edgePath, layoutReplay } from './replayLayout'

const PHASES: { label: string; roles: string[] }[] = [
  { label: '集資', roles: ['victim', 'support', 'aggregator'] },
  { label: '分層', roles: ['mule', 'peel'] },
  { label: '整合', roles: ['otc', 'downstream'] },
]

const ROLE_HEAD: Record<string, string> = {
  victim: '被害人',
  support: '客服收款',
  mule: '車手',
  peel: '剝洋蔥鏈',
}

/**
 * 劇本金流圖：依洗錢三階段由左至右分欄的靜態 SVG（情境 1～5 與工作台劇本圖）。
 * 每一欄是什麼角色、錢怎麼流向審查目標，投影時後排也看得懂。
 * 情境 6～8 的目標角色不在三階段欄位裡，改用 FocusGraph；任意鏈上圖仍用 GraphView（Cytoscape）。
 */
export function ScenarioGraph({
  payload,
  target,
  highlightPath = [],
  selected,
  onSelect,
}: {
  payload: GraphPayload
  target?: string
  highlightPath?: string[]
  selected?: string | null
  onSelect?: (nodeId: string) => void
}) {
  const layout = useMemo(() => layoutReplay(payload, target ?? ''), [payload, target])
  const [hover, setHover] = useState<GraphNode | null>(null)
  const pathEdges = new Set(highlightPath.slice(0, -1).map((id, index) => `${id}>${highlightPath[index + 1]}`))
  const pathNodes = new Set(highlightPath)
  const point = (id: string) => layout.get(id) as { x: number; y: number }

  const columnHeads = Object.entries(ROLE_HEAD)
    .map(([role, label]) => {
      const members = payload.nodes.filter((node) => node.role === role)
      if (members.length === 0) return null
      const xs = members.map((node) => point(node.id).x)
      return { role, label: `${label} ×${members.length}`, x: xs.reduce((a, b) => a + b, 0) / xs.length }
    })
    .filter((item): item is { role: string; label: string; x: number } => item !== null)

  const phases = PHASES.map((phase) => {
    const xs = payload.nodes.filter((node) => phase.roles.includes(node.role)).map((node) => point(node.id).x)
    if (xs.length === 0) return null
    return { label: phase.label, from: Math.min(...xs) - 34, to: Math.max(...xs) + 34 }
  }).filter((item): item is { label: string; from: number; to: number } => item !== null)

  const active = hover ?? payload.nodes.find((node) => node.id === selected) ?? null
  const hub = payload.nodes.find((node) => node.role === 'aggregator')

  return (
    <figure>
      <div className="graph-scroll relative border border-line">
        <svg
          viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
          className="replay-stage block h-auto w-full"
          data-testid="graph-view"
          role="img"
          aria-label="金流圖：由左至右為集資、分層、整合三階段；訊號色粗線為流向審查目標的風險資金路徑"
        >
          {phases.map((phase) => (
            <g key={phase.label}>
              <text x={(phase.from + phase.to) / 2} y="36" className="replay-phase">{phase.label}</text>
              <line x1={phase.from} y1="50" x2={phase.to} y2="50" className="replay-phase-rule" />
            </g>
          ))}
          <g className="replay-label">
            {columnHeads.map((head) => (
              <text key={head.role} x={head.x} y="76" textAnchor="middle">{head.label}</text>
            ))}
          </g>

          {payload.edges.map((edge) => {
            const onPath = pathEdges.has(`${edge.source}>${edge.target}`)
            return (
              <path
                key={`${edge.source}>${edge.target}`}
                d={edgePath(point(edge.source), point(edge.target))}
                pathLength={1}
                className={['replay-edge is-on', onPath ? 'is-path' : ''].join(' ')}
              />
            )
          })}

          {payload.nodes.map((node) => {
            const { x, y } = point(node.id)
            const isTarget = node.id === target
            const entity = ENTITY_ROLES.has(node.role)
            const radius = node.role === 'aggregator' ? 24 : isTarget ? 18 : node.role === 'peel_side' ? 6 : node.role === 'victim' || node.role === 'normal' ? 9 : 13
            const tone = isTarget ? 'is-target' : node.label === 'high' ? 'is-risky' : node.role === 'victim' ? 'is-victim' : ''
            return (
              <g key={node.id}>
                {(isTarget || node.id === selected) && <circle cx={x} cy={y} r={radius + 9} className="graph-halo" />}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  className={['replay-node is-on', tone, entity ? 'is-entity' : '', onSelect ? 'cursor-pointer' : ''].join(' ')}
                  onPointerEnter={() => setHover(node)}
                  onPointerLeave={() => setHover(null)}
                  onClick={onSelect ? () => onSelect(node.id) : undefined}
                >
                  <title>{`${node.id}｜${node.role_zh}｜自身結構分數 ${node.score.toFixed(2)}`}</title>
                </circle>
              </g>
            )
          })}

          <g className="replay-label">
            {hub && pathNodes.has(hub.id) && (
              <text x={point(hub.id).x} y={point(hub.id).y - 36} textAnchor="middle" className="is-strong">集資主錢包</text>
            )}
            {target && layout.has(target) && (
              <text x={point(target).x} y={point(target).y - 30} textAnchor="middle" className="is-strong">審查目標</text>
            )}
            {payload.nodes.some((node) => node.role === 'normal') && (
              <text x="762" y="500" className="replay-note">與本案無關的正常交易</text>
            )}
          </g>
        </svg>

        {active && (
          <div className="graph-tip" role="status">
            <div className="tabular font-bold">{active.id}</div>
            <div>{active.role_zh}</div>
            <div>
              自身結構分數 <span className="tabular font-bold">{active.score.toFixed(2)}</span>
              {active.is_motif_center && '　命中洗錢圖樣'}
            </div>
          </div>
        )}
      </div>

      <GraphLegend hasPath={highlightPath.length > 0} hasEntity={payload.nodes.some((node) => ENTITY_ROLES.has(node.role))} />
      {onSelect && <p className="mt-1 text-sm text-muted">點選節點查看該地址的風險證據。</p>}
    </figure>
  )
}
