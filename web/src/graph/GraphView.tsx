import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import type { DagreLayoutOptions } from 'cytoscape-dagre'
import { useEffect, useRef } from 'react'
import type { GraphPayload } from '../api/types'
import { type ColorScheme, GRAPH_COLOR, toElements } from './elements'

cytoscape.use(dagre)

const STYLE: cytoscape.StylesheetJson = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      width: 'data(size)',
      height: 'data(size)',
      label: 'data(label)',
      color: '#F3EFE6',
      'font-size': 12,
      'font-family': '"JetBrains Mono", ui-monospace, Menlo, monospace',
      'text-outline-color': '#121110',
      'text-outline-width': 2,
      'text-valign': 'bottom',
      'text-margin-y': 4,
      'border-width': 0,
    },
  },
  {
    // 工作台用分數色階時，命中圖樣的節點靠外框而非填色來標示
    selector: 'node[?motifCenter]',
    style: { 'border-width': 2, 'border-color': '#F3EFE6' },
  },
  {
    selector: 'node[?focused]',
    style: { 'border-width': 5, 'border-color': '#E4571F' },
  },
  {
    selector: 'edge',
    style: {
      width: 1,
      'line-color': '#4A4740',
      'target-arrow-color': '#4A4740',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.7,
      'curve-style': 'bezier',
    },
  },
  {
    selector: 'edge[?highlighted]',
    style: { width: 5, 'line-color': '#E4571F', 'target-arrow-color': '#E4571F' },
  },
]

export function GraphView({
  payload,
  highlightPath,
  focus,
  layout,
  scheme,
  onSelect,
}: {
  payload: GraphPayload
  highlightPath?: string[]
  focus?: string
  /** dagre＝劇本圖由左至右說故事；cose＝真實 2-hop 圖沒有敘事順序 */
  layout: 'dagre' | 'cose'
  scheme: ColorScheme
  onSelect?: (nodeId: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    const dagreLayout: DagreLayoutOptions = {
      name: 'dagre',
      rankDir: 'LR',
      nodeSep: 18,
      rankSep: 90,
    }
    const cy = cytoscape({
      container: container.current,
      elements: toElements(payload, { scheme, highlightPath, focus }),
      style: STYLE,
      layout:
        layout === 'dagre' ? dagreLayout : { name: 'cose', randomize: false, animate: false },
      minZoom: 0.2,
      maxZoom: 2.5,
    })
    if (onSelect) {
      cy.on('tap', 'node', (event) => onSelect(event.target.id() as string))
    }
    return () => cy.destroy()
  }, [payload, highlightPath, focus, layout, scheme, onSelect])

  return (
    <div>
      <div
        ref={container}
        data-testid="graph-view"
        className="h-[420px] w-full md:h-[520px]"
        style={{ backgroundColor: 'var(--color-graph-bg)' }}
      />
      <GraphLegend scheme={scheme} hasPath={Boolean(highlightPath?.length)} hasFocus={Boolean(focus)} />
    </div>
  )
}

/** 圖例：圖上每一種顏色都要有說明，不能只靠標題提兩種 */
function GraphLegend({ scheme, hasPath, hasFocus }: { scheme: ColorScheme; hasPath: boolean; hasFocus: boolean }) {
  const items =
    scheme === 'role'
      ? [
          { color: GRAPH_COLOR.risk, label: '風險節點（命中圖樣或高分）' },
          { color: GRAPH_COLOR.victim, label: '被害人' },
          { color: GRAPH_COLOR.normal, label: '正常交易' },
          { color: GRAPH_COLOR.other, label: '其他出金地址' },
          { color: GRAPH_COLOR.minor, label: '剝離的小額地址' },
        ]
      : [
          { color: GRAPH_COLOR.risk, label: '高風險 ≥0.7' },
          { color: GRAPH_COLOR.victim, label: '中風險 ≥0.4' },
          { color: GRAPH_COLOR.normal, label: '低風險' },
        ]
  return (
    <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
      {hasPath && (
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-1 w-7" style={{ backgroundColor: GRAPH_COLOR.risk }} />
          風險資金路徑
        </li>
      )}
      {hasFocus && (
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3.5 w-3.5 rounded-full border-[3px]"
            style={{ backgroundColor: GRAPH_COLOR.focus, borderColor: GRAPH_COLOR.risk }}
          />
          審查目標
        </li>
      )}
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
      <li className="text-muted">只標示關鍵節點名稱；滾輪縮放、拖曳平移</li>
    </ul>
  )
}
