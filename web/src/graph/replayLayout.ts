import type { GraphPayload } from '../api/types'

/** 案件重演舞台的座標系（SVG viewBox） */
export const STAGE = { width: 1200, height: 560 }

export interface ReplayNode {
  id: string
  role: string
  x: number
  y: number
  /** 沿資金流反向追溯到出金目標的階數；不在上游者為 null */
  distance: number | null
}

const COLUMN_X0 = 70
const COLUMN_GAP = 150
const BAND_TOP = 96
const BAND_BOTTOM = 410
const MAX_ROW_GAP = 46
const NORMAL_STRIP_Y = 528
const NORMAL_X0 = 770
const NORMAL_GAP = 90

/** 洗錢三階段由左至右：集資（被害人→客服→主錢包）、分層（車手→剝洋蔥鏈）、整合（出金地址） */
function columnOf(id: string, role: string): number | null {
  switch (role) {
    case 'victim':
      return 0
    case 'support':
      return 1
    case 'aggregator':
      return 2
    case 'mule':
      return 3
    case 'peel':
      return 4 + Number(id.at(-1) ?? 0)
    case 'otc':
      return 7
    case 'downstream':
      return 8
    default:
      return null
  }
}

/** 反向 BFS：每個節點距離出金目標幾階（只走資金流向的反方向） */
export function reverseDistances(graph: GraphPayload, target: string): Map<string, number> {
  const incoming = new Map<string, string[]>()
  for (const edge of graph.edges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source])
  }
  const distances = new Map<string, number>([[target, 0]])
  const queue = [target]
  while (queue.length > 0) {
    const current = queue.shift() as string
    for (const source of incoming.get(current) ?? []) {
      if (!distances.has(source)) {
        distances.set(source, (distances.get(current) as number) + 1)
        queue.push(source)
      }
    }
  }
  return distances
}

function spread(count: number): number[] {
  if (count === 1) return [(BAND_TOP + BAND_BOTTOM) / 2]
  const gap = Math.min(MAX_ROW_GAP * 2.2, (BAND_BOTTOM - BAND_TOP) / (count - 1))
  const top = (BAND_TOP + BAND_BOTTOM) / 2 - (gap * (count - 1)) / 2
  return Array.from({ length: count }, (_, index) => top + gap * index)
}

/**
 * 依角色分欄、欄內以「上游節點平均高度」排序，減少連線交叉。
 * 只服務內建劇本圖（角色已知）；任意鏈上圖請用工作台的力導向排版。
 */
export function layoutReplay(graph: GraphPayload, target: string): Map<string, ReplayNode> {
  const distances = reverseDistances(graph, target)
  const placed = new Map<string, ReplayNode>()
  const incoming = new Map<string, string[]>()
  const outgoing = new Map<string, string[]>()
  for (const edge of graph.edges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source])
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])
  }

  const columns = new Map<number, string[]>()
  for (const node of graph.nodes) {
    const column = columnOf(node.id, node.role)
    if (column !== null) columns.set(column, [...(columns.get(column) ?? []), node.id])
  }
  const roleOf = new Map(graph.nodes.map((node) => [node.id, node.role]))
  // 延伸情境多一欄（第 3 階下游地址）時，整體欄距等比縮小，舞台寬度不變
  const maxColumn = Math.max(7, ...columns.keys())
  const gap = (COLUMN_GAP * 7) / maxColumn

  for (const column of [...columns.keys()].sort((a, b) => a - b)) {
    const ids = columns.get(column) as string[]
    const anchor = (id: string): number => {
      const parents = (incoming.get(id) ?? []).filter((parent) => placed.has(parent))
      if (parents.length === 0) return Number.NaN
      return parents.reduce((sum, parent) => sum + (placed.get(parent) as ReplayNode).y, 0) / parents.length
    }
    const sorted =
      column === 0
        ? // 被害人沒有上游：依打款對象分組，同組相鄰
          [...ids].sort((a, b) =>
            `${(outgoing.get(a) ?? [''])[0]}${a}`.localeCompare(`${(outgoing.get(b) ?? [''])[0]}${b}`),
          )
        : [...ids].sort((a, b) => {
            const delta = anchor(a) - anchor(b)
            return Number.isNaN(delta) || delta === 0 ? a.localeCompare(b) : delta
          })
    const ys = spread(sorted.length)
    sorted.forEach((id, index) => {
      placed.set(id, {
        id,
        role: roleOf.get(id) as string,
        x: COLUMN_X0 + column * gap,
        y: ys[index],
        distance: distances.get(id) ?? null,
      })
    })
  }

  // 剝離的小額地址：掛在來源節點右上方，不佔主欄位
  for (const node of graph.nodes) {
    if (node.role !== 'peel_side') continue
    const parent = (incoming.get(node.id) ?? []).map((id) => placed.get(id)).find(Boolean)
    if (!parent) continue
    placed.set(node.id, { id: node.id, role: node.role, x: parent.x + 66, y: parent.y - 30, distance: null })
  }

  // 與本案無關的正常交易：排在底部一列，對照用
  const normals = graph.nodes.filter((node) => !placed.has(node.id))
  normals.forEach((node, index) => {
    placed.set(node.id, {
      id: node.id,
      role: node.role,
      x: NORMAL_X0 + index * NORMAL_GAP,
      y: NORMAL_STRIP_Y,
      distance: distances.get(node.id) ?? null,
    })
  })

  return placed
}

/**
 * 兩節點間的連線。跨兩欄以上的長邊（例如車手直接打給出金地址）改走弧線，
 * 從兩列節點之間穿過，避免看起來像是「經過」同一列上無關的節點。
 */
export function edgePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  if (Math.abs(to.x - from.x) <= COLUMN_GAP * 1.5) return `M${from.x} ${from.y}L${to.x} ${to.y}`
  const controlX = (from.x + to.x) / 2
  // 底部那列正常交易沒有下方空間，改往上彎
  const bend = Math.min(from.y, to.y) >= NORMAL_STRIP_Y ? -56 : 96
  const controlY = (from.y + to.y) / 2 + bend
  return `M${from.x} ${from.y}Q${controlX} ${controlY} ${to.x} ${to.y}`
}
