import { describe, expect, it } from 'vitest'
import { SCREENING_SNAPSHOT } from '../api/snapshot'
import { STAGE, edgePath, layoutReplay, reverseDistances } from './replayLayout'

const graph = SCREENING_SNAPSHOT.graph
const target = SCREENING_SNAPSHOT.target

describe('reverseDistances', () => {
  it('沿資金流反向計算階數，與 API 的關聯階數一致', () => {
    const distances = reverseDistances(graph, target)
    expect(distances.get(target)).toBe(0)
    for (const association of SCREENING_SNAPSHOT.associations) {
      expect(distances.get(association.risky_node)).toBe(association.distance)
    }
  })

  it('不在上游的節點（正常用戶、剝離的小額地址）沒有階數', () => {
    const distances = reverseDistances(graph, target)
    expect(distances.has('TNormalUser01')).toBe(false)
    expect(distances.has('TSideA0')).toBe(false)
  })
})

describe('layoutReplay', () => {
  const layout = layoutReplay(graph, target)

  it('每個節點都有座標，且落在舞台內', () => {
    expect(layout.size).toBe(graph.nodes.length)
    for (const node of layout.values()) {
      expect(node.x).toBeGreaterThan(0)
      expect(node.x).toBeLessThan(STAGE.width)
      expect(node.y).toBeGreaterThan(0)
      expect(node.y).toBeLessThan(STAGE.height)
    }
  })

  it('資金由左至右：被害人 → 集資主錢包 → 車手 → 出金目標', () => {
    const x = (id: string) => layout.get(id)?.x as number
    expect(x('TVictim01')).toBeLessThan(x('TAggregator01'))
    expect(x('TAggregator01')).toBeLessThan(x('TMule03'))
    expect(x('TMule03')).toBeLessThan(x(target))
  })

  it('同一欄的節點不重疊', () => {
    const seen = new Set<string>()
    for (const node of layout.values()) {
      const key = `${Math.round(node.x)}:${Math.round(node.y)}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })
})

describe('edgePath', () => {
  it('相鄰欄走直線，跨多欄走弧線', () => {
    expect(edgePath({ x: 0, y: 0 }, { x: 150, y: 40 })).toBe('M0 0L150 40')
    expect(edgePath({ x: 0, y: 100 }, { x: 600, y: 100 })).toMatch(/^M0 100Q300 \d+ 600 100$/)
  })
})
