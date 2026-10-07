import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import type { DagreLayoutOptions } from 'cytoscape-dagre'
import { useEffect, useRef } from 'react'
import type { GraphPayload } from '../api/types'
import { useLang } from '../i18n'
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
      color: '#FFFFFF',
      'font-size': 12,
      // 只用系統字型：Cytoscape 在初始化當下量文字寬度，網頁字型晚到會讓長標籤兩端被裁掉
      'font-family': 'ui-monospace, Consolas, Menlo, monospace',
      // 用底色襯字而非描邊：描邊會讓 Cytoscape 的文字貼圖在左右兩端被裁掉一截
      'text-background-color': '#0B0D12',
      'text-background-opacity': 0.85,
      'text-background-padding': '3px',
      'text-valign': 'bottom',
      'text-margin-y': 4,
      'border-width': 0,
    },
  },
  {
    // 工作台用分數色階時，命中圖樣的節點靠外框而非填色來標示
    selector: 'node[?motifCenter]',
    style: { 'border-width': 2, 'border-color': '#FFFFFF' },
  },
  {
    selector: 'node[?entity]',
    style: { 'border-width': 4, 'border-color': GRAPH_COLOR.entity },
  },
  {
    selector: 'node[?focused]',
    style: { 'border-width': 5, 'border-color': GRAPH_COLOR.risk },
  },
  {
    selector: 'edge',
    style: {
      width: 1,
      'line-color': GRAPH_COLOR.edge,
      'target-arrow-color': GRAPH_COLOR.edge,
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.7,
      'curve-style': 'bezier',
    },
  },
  {
    selector: 'edge[?highlighted]',
    style: { width: 5, 'line-color': GRAPH_COLOR.risk, 'target-arrow-color': GRAPH_COLOR.risk },
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
        style={{ backgroundColor: GRAPH_COLOR.bg }}
      />
      <GraphLegend scheme={scheme} hasPath={Boolean(highlightPath?.length)} hasFocus={Boolean(focus)} />
    </div>
  )
}

/** 圖例：圖上每一種顏色都要有說明，不能只靠標題提兩種 */
function GraphLegend({ scheme, hasPath, hasFocus }: { scheme: ColorScheme; hasPath: boolean; hasFocus: boolean }) {
  const { t } = useLang()
  const items =
    scheme === 'role'
      ? [
          { color: GRAPH_COLOR.risk, label: t('風險節點（命中圖樣或高分）', 'Risk node (pattern match or high score)') },
          { color: GRAPH_COLOR.victim, label: t('被害人', 'Victim') },
          { color: GRAPH_COLOR.normal, label: t('正常交易', 'Normal transaction') },
          { color: GRAPH_COLOR.other, label: t('其他出金地址', 'Other cash-out address') },
          { color: GRAPH_COLOR.entity, label: t('已標註實體（描邊）', 'Labelled entity (outline)') },
          { color: GRAPH_COLOR.minor, label: t('剝離的小額地址', 'Peeled-off small address') },
        ]
      : [
          { color: GRAPH_COLOR.risk, label: t('高風險 ≥0.7', 'High risk ≥0.7') },
          { color: GRAPH_COLOR.victim, label: t('中風險 ≥0.4', 'Medium risk ≥0.4') },
          { color: GRAPH_COLOR.normal, label: t('低風險', 'Low risk') },
        ]
  return (
    <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
      {hasPath && (
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-1 w-7" style={{ backgroundColor: GRAPH_COLOR.risk }} />
          {t('風險資金路徑', 'Risky fund path')}
        </li>
      )}
      {hasFocus && (
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3.5 w-3.5 rounded-full border-[3px]"
            style={{ backgroundColor: GRAPH_COLOR.focus, borderColor: GRAPH_COLOR.risk }}
          />
          {t('審查目標', 'Target')}
        </li>
      )}
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
      <li className="text-muted">{t('只標示關鍵節點名稱；滾輪縮放、拖曳平移', 'Only key nodes are labelled; scroll to zoom, drag to pan')}</li>
    </ul>
  )
}
