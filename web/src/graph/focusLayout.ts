import type { GraphPayload } from '../api/types'
import { STAGE } from './replayLayout'

/**
 * 焦點版面：以審查目標為中心，上游往左、下游往右，一欄一階。
 * 給情境 6～8 用——目標角色（拆單整合、快進快出中繼、交易所用戶）不在洗錢三階段的欄位裡，
 * 用三階段分欄反而看不出錢往哪流。只畫與目標 N 階內相連的子圖，其餘節點收合成一個數字。
 */
export interface FocusNode {
  id: string
  role: string
  /** 負數＝上游第 n 階；0＝目標與同批收款地址；正數＝下游 */
  column: number
  kind: 'target' | 'upstream' | 'downstream' | 'sibling'
  x: number
  y: number
}

export interface FocusLayout {
  nodes: Map<string, FocusNode>
  /** 未畫出的節點數（與目標 N 階內無關聯） */
  hidden: number
  columns: number[]
}

const MARGIN_X = 90
const BAND_TOP = 110
const BAND_BOTTOM = 470
const MAX_GAP = 230
/** 一欄超過這個數就改成兩排交錯，30 個交易所用戶才排得下 */
const ZIGZAG_AT = 12

function bfs(adjacency: Map<string, string[]>, start: string, limit: number): Map<string, number> {
  const distances = new Map<string, number>([[start, 0]])
  const queue = [start]
  while (queue.length > 0) {
    const current = queue.shift() as string
    const depth = distances.get(current) as number
    if (depth >= limit) continue
    for (const next of adjacency.get(current) ?? []) {
      if (!distances.has(next)) {
        distances.set(next, depth + 1)
        queue.push(next)
      }
    }
  }
  return distances
}

function spread(count: number): number[] {
  if (count === 1) return [(BAND_TOP + BAND_BOTTOM) / 2]
  const gap = Math.min(96, (BAND_BOTTOM - BAND_TOP) / (count - 1))
  const top = (BAND_TOP + BAND_BOTTOM) / 2 - (gap * (count - 1)) / 2
  return Array.from({ length: count }, (_, index) => top + gap * index)
}

export function layoutFocus(
  graph: GraphPayload,
  target: string,
  options: { upstream?: number; downstream?: number } = {},
): FocusLayout {
  const upstreamLimit = options.upstream ?? 4
  const downstreamLimit = options.downstream ?? 1
  const incoming = new Map<string, string[]>()
  const outgoing = new Map<string, string[]>()
  for (const edge of graph.edges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source])
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])
  }
  const roleOf = new Map(graph.nodes.map((node) => [node.id, node.role]))
  if (!roleOf.has(target)) return { nodes: new Map(), hidden: graph.nodes.length, columns: [] }

  const up = bfs(incoming, target, upstreamLimit)
  const down = bfs(outgoing, target, downstreamLimit)

  const column = new Map<string, number>()
  const kind = new Map<string, FocusNode['kind']>()
  column.set(target, 0)
  kind.set(target, 'target')
  for (const [id, depth] of up) {
    if (id === target) continue
    column.set(id, -depth)
    kind.set(id, 'upstream')
  }
  for (const [id, depth] of down) {
    if (column.has(id)) continue
    column.set(id, depth)
    kind.set(id, 'downstream')
  }
  // 同批收款地址：直接上游的其他付款對象（例：熱錢包同一批出金的 30 名用戶、集資主錢包拆給的其他人頭）
  for (const parent of incoming.get(target) ?? []) {
    for (const sibling of outgoing.get(parent) ?? []) {
      if (!column.has(sibling)) {
        column.set(sibling, 0)
        kind.set(sibling, 'sibling')
      }
    }
  }

  const byColumn = new Map<number, string[]>()
  for (const [id, col] of column) byColumn.set(col, [...(byColumn.get(col) ?? []), id])
  const columns = [...byColumn.keys()].sort((a, b) => a - b)
  const gap = columns.length > 1 ? Math.min(MAX_GAP, (STAGE.width - MARGIN_X * 2) / (columns.length - 1)) : 0
  const totalWidth = gap * (columns.length - 1)
  const x0 = (STAGE.width - totalWidth) / 2
  const xOf = (col: number) => x0 + (col - columns[0]) * gap

  const placed = new Map<string, FocusNode>()
  const anchor = (id: string): number => {
    const neighbours = [...(incoming.get(id) ?? []), ...(outgoing.get(id) ?? [])].filter((n) => placed.has(n))
    if (neighbours.length === 0) return Number.NaN
    return neighbours.reduce((sum, n) => sum + (placed.get(n) as FocusNode).y, 0) / neighbours.length
  }
  // 先擺目標那一欄（目標置中），再往左右外擴，每欄依已擺好的鄰居平均高度排序，減少交叉
  const order = [0, ...columns.filter((c) => c !== 0).sort((a, b) => Math.abs(a) - Math.abs(b) || a - b)]
  for (const col of order) {
    const ids = byColumn.get(col) ?? []
    const sorted =
      col === 0
        ? [...ids].sort((a, b) => a.localeCompare(b))
        : [...ids].sort((a, b) => {
            const delta = anchor(a) - anchor(b)
            return Number.isNaN(delta) || delta === 0 ? a.localeCompare(b) : delta
          })
    if (col === 0 && sorted.length > 1) {
      // 目標放在正中間，同批的排在它上下
      const index = sorted.indexOf(target)
      sorted.splice(index, 1)
      sorted.splice(Math.floor(sorted.length / 2), 0, target)
    }
    const ys = spread(sorted.length)
    const zigzag = sorted.length > ZIGZAG_AT
    sorted.forEach((id, index) => {
      const offset = zigzag && id !== target ? (index % 2 === 0 ? -gap * 0.16 : gap * 0.16) : 0
      placed.set(id, {
        id,
        role: roleOf.get(id) ?? 'normal',
        column: col,
        kind: kind.get(id) as FocusNode['kind'],
        x: xOf(col) + offset,
        y: ys[index],
      })
    })
  }

  return { nodes: placed, hidden: graph.nodes.length - placed.size, columns }
}
