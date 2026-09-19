import type { ElementDefinition } from 'cytoscape'
import type { GraphNode, GraphPayload } from '../api/types'

/**
 * 與首頁案件重演同一套語意：金＝被害人、訊號色＝風險節點、灰藍＝其他、白＝審查目標、模型色＝已標註實體。
 * Cytoscape 畫在 canvas 上讀不到 CSS 變數，這裡必須寫原始 hex（對應 index.css 的 token）。
 * 對比值為 ink #0B0D12 畫布上實算，非文字門檻 3:1。
 */
export const GRAPH_COLOR = {
  victim: '#E2C06A', // 11.09:1
  risk: '#FF5C3A', // 6.33:1
  normal: '#6B7A95', // 4.48:1
  minor: '#4A5670', // 2.64:1 — 剝離的小額地址（刻意退到背景）
  other: '#C9D2E0', // 13.0:1 — 其他出金地址
  focus: '#FFFFFF', // 19.43:1
  entity: '#4CC9F0', // 10.11:1 — 已標註實體描邊（GNN 模型專用色）
  bg: '#0B0D12',
  edge: '#5F6E8C', // 3.79:1
} as const

const ROLE_COLOR: Record<string, string> = {
  victim: GRAPH_COLOR.victim,
  support: GRAPH_COLOR.risk,
  aggregator: GRAPH_COLOR.risk,
  mule: GRAPH_COLOR.risk,
  peel: GRAPH_COLOR.risk,
  peel_side: GRAPH_COLOR.minor,
  otc: GRAPH_COLOR.other,
  normal: GRAPH_COLOR.normal,
  smurf: GRAPH_COLOR.risk,
  split_collector: GRAPH_COLOR.other,
  relay: GRAPH_COLOR.other,
  hot_wallet: GRAPH_COLOR.normal,
  exchange_user: GRAPH_COLOR.normal,
}

const FOCUS_COLOR = GRAPH_COLOR.focus
const HIT_COLOR = GRAPH_COLOR.risk
const MED_COLOR = GRAPH_COLOR.victim
const LOW_COLOR = GRAPH_COLOR.normal
const HIGH_SCORE = 0.7
const MED_SCORE = 0.4

/**
 * role＝劇本圖，沿用角色語意配色。
 * risk＝工作台，範例圖與真實 TRON 圖沒有 role 屬性（全是 normal），
 *       只靠角色著色會渲染成整片單色，故改用分數色階。
 */
export type ColorScheme = 'role' | 'risk'

export function nodeColor(
  node: GraphNode,
  options: { scheme: ColorScheme; focus?: string },
): string {
  if (options.focus && node.id === options.focus) return FOCUS_COLOR
  if (options.scheme === 'risk') {
    if (node.score >= HIGH_SCORE) return HIT_COLOR
    if (node.score >= MED_SCORE) return MED_COLOR
    return LOW_COLOR
  }
  if (node.is_motif_center || node.score >= HIGH_SCORE) return HIT_COLOR
  return ROLE_COLOR[node.role] ?? ROLE_COLOR.normal
}

export function toElements(
  payload: GraphPayload,
  options: { scheme: ColorScheme; highlightPath?: string[]; focus?: string },
): ElementDefinition[] {
  const { scheme, highlightPath = [], focus } = options
  const pathEdges = new Set(
    highlightPath.slice(0, -1).map((from, index) => `${from}->${highlightPath[index + 1]}`),
  )

  const pathNodes = new Set(highlightPath)

  const nodes: ElementDefinition[] = payload.nodes.map((node) => ({
    data: {
      id: node.id,
      // 只標關鍵節點（審查目標、風險路徑、命中圖樣或高分），其餘點選後在側欄看；
      // 53 個節點全標會糊成一片，投影時一個字也讀不到
      label:
        focus === node.id || pathNodes.has(node.id) || node.is_motif_center || node.score >= HIGH_SCORE
          ? node.id.length > 14
            ? `${node.id.slice(0, 14)}…`
            : node.id
          : '',
      roleZh: node.role_zh,
      score: node.score,
      narrative: node.narrative_zh,
      color: nodeColor(node, { scheme, focus }),
      size: 16 + node.pagerank * 300,
      focused: focus === node.id,
      motifCenter: node.is_motif_center,
      entity: node.role === 'hot_wallet',
    },
  }))

  const edges: ElementDefinition[] = payload.edges.map((edge, index) => ({
    data: {
      id: `e${index}`,
      source: edge.source,
      target: edge.target,
      amount: edge.amount,
      highlighted: pathEdges.has(`${edge.source}->${edge.target}`),
    },
  }))

  return [...nodes, ...edges]
}
