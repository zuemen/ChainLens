import { describe, expect, it } from 'vitest'
import type { GraphNode, GraphPayload } from '../api/types'
import { STAGE } from './replayLayout'
import { layoutFocus } from './focusLayout'

function node(id: string, role: string): GraphNode {
  return { id, role, role_zh: role, score: 0, label: 'low', is_motif_center: false, pagerank: 0.01, narrative_zh: '' }
}

/** 情境八縮小版：熱錢包批次付給 3 名用戶，熱錢包的錢來自兩家商店；另有一段無關的洗錢鏈 */
const payload: GraphPayload = {
  nodes: [
    node('TShopA', 'normal'),
    node('TShopB', 'normal'),
    node('THotWallet02', 'hot_wallet'),
    node('TExchUser01', 'exchange_user'),
    node('TExchUser02', 'exchange_user'),
    node('TExchUser07', 'exchange_user'),
    node('TAggregator01', 'aggregator'),
    node('TMule01', 'mule'),
  ],
  edges: [
    { source: 'TShopA', target: 'THotWallet02', amount: 12000, timestamp: 1 },
    { source: 'TShopB', target: 'THotWallet02', amount: 5000, timestamp: 2 },
    { source: 'THotWallet02', target: 'TExchUser01', amount: 3000, timestamp: 3 },
    { source: 'THotWallet02', target: 'TExchUser02', amount: 3000, timestamp: 4 },
    { source: 'THotWallet02', target: 'TExchUser07', amount: 3000, timestamp: 5 },
    { source: 'TAggregator01', target: 'TMule01', amount: 90000, timestamp: 6 },
  ],
  meta: { node_count: 8, total_node_count: 8, edge_count: 6, truncated: false, story_zh: null, degraded: false },
}

describe('layoutFocus', () => {
  const layout = layoutFocus(payload, 'TExchUser07')

  it('目標在第 0 欄，直接上游在 −1、再上游在 −2', () => {
    expect(layout.nodes.get('TExchUser07')?.column).toBe(0)
    expect(layout.nodes.get('THotWallet02')?.column).toBe(-1)
    expect(layout.nodes.get('TShopA')?.column).toBe(-2)
    expect(layout.nodes.get('TShopA')?.kind).toBe('upstream')
  })

  it('同一批收款的其他用戶排在目標同一欄，標為 sibling', () => {
    expect(layout.nodes.get('TExchUser01')?.column).toBe(0)
    expect(layout.nodes.get('TExchUser01')?.kind).toBe('sibling')
  })

  it('與目標無關的洗錢鏈不畫，計入 hidden', () => {
    expect(layout.nodes.has('TAggregator01')).toBe(false)
    expect(layout.hidden).toBe(2)
  })

  it('上游在左、目標在右，資金由左往右流；所有座標落在舞台內', () => {
    const x = (id: string) => layout.nodes.get(id)!.x
    expect(x('TShopA')).toBeLessThan(x('THotWallet02'))
    expect(x('THotWallet02')).toBeLessThan(x('TExchUser07'))
    for (const item of layout.nodes.values()) {
      expect(item.x).toBeGreaterThan(0)
      expect(item.x).toBeLessThan(STAGE.width)
      expect(item.y).toBeGreaterThan(0)
      expect(item.y).toBeLessThan(STAGE.height)
    }
  })

  it('目標不在圖中時回傳空版面', () => {
    const empty = layoutFocus(payload, 'TNobody')
    expect(empty.nodes.size).toBe(0)
    expect(empty.hidden).toBe(payload.nodes.length)
  })
})
