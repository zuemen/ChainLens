import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ScreenResult } from '../api/types'
import { DecisionCard } from './DecisionCard'

const emptyGraph: ScreenResult['graph'] = {
  nodes: [],
  edges: [],
  meta: { node_count: 0, total_node_count: 0, edge_count: 0, truncated: false, story_zh: null, degraded: false },
}

/** 情境一：規則暫緩、模型同樣判高 */
const blocked: ScreenResult = {
  target: 'TOtcOut01',
  amount_usdt: 500000,
  risk_score: 0.7307,
  self_score: 0.3268,
  association_score: 0.6,
  decision: 'block',
  decision_zh: '暫緩出金並啟動人工審查',
  rule_decision: 'block',
  model: { score: 0.9885, level: 'high', facts_zh: ['收款來源 3 個、付款對象 0 個'], narrative_zh: '模型敘事' },
  model_escalated: false,
  counterfactual: null,
  narrative_zh: '敘事',
  associations: [
    {
      risky_node: 'TAggregator01',
      distance: 2,
      path: ['TAggregator01', 'TMule03', 'TOtcOut01'],
      motifs: ['fan_in', 'fan_out', 'gather_scatter'],
    },
  ],
  evidence: null,
  str_draft_zh: '草稿',
  graph: emptyGraph,
  highlight_path: ['TAggregator01', 'TMule03', 'TOtcOut01'],
}

/** 情境七：規則放行 0.19，模型 0.98 加註 → 加強審查 */
const escalated: ScreenResult = {
  ...blocked,
  target: 'TRelay03',
  amount_usdt: 200000,
  risk_score: 0.1893,
  self_score: 0.0686,
  association_score: 0.1296,
  decision: 'review',
  decision_zh: '加強審查（EDD）——由 GNN 模型加註',
  rule_decision: 'pass',
  model: { score: 0.9785, level: 'high', facts_zh: ['收款來源 1 個、付款對象 0 個'], narrative_zh: '模型敘事' },
  model_escalated: true,
  associations: [],
  highlight_path: [],
}

/** 情境八：規則 0.02、模型 0.10 放行；反事實 1.00 暫緩、30 名連坐 */
const exchangeUser: ScreenResult = {
  ...blocked,
  target: 'TExchUser07',
  amount_usdt: 3000,
  risk_score: 0.0186,
  self_score: 0.0186,
  association_score: 0,
  decision: 'pass',
  decision_zh: '予以放行',
  rule_decision: 'pass',
  model: { score: 0.0985, level: 'low', facts_zh: ['收款來源 1 個、付款對象 0 個'], narrative_zh: '模型敘事' },
  model_escalated: false,
  counterfactual: {
    label_zh: '若沒有實體標註',
    risk_score: 1.0,
    decision: 'block',
    decision_zh: '暫緩出金並啟動人工審查',
    affected_nodes: 30,
  },
  associations: [],
  highlight_path: [],
}

describe('DecisionCard 三欄', () => {
  it('規則引擎欄：綜合、自身、關聯三個分數——這是 Demo 的論點', () => {
    render(<DecisionCard result={blocked} />)
    expect(screen.getByText('0.73')).toBeDefined()
    expect(screen.getByText('0.33')).toBeDefined()
    expect(screen.getByText('0.60')).toBeDefined()
    expect(screen.getByText(/引擎一/)).toBeDefined()
  })

  it('GNN 模型欄：機率、等級與模型看到的結構事實', () => {
    render(<DecisionCard result={blocked} />)
    expect(screen.getByText('0.99')).toBeDefined()
    expect(screen.getByText('高')).toBeDefined()
    expect(screen.getByText('收款來源 3 個、付款對象 0 個')).toBeDefined()
  })

  it('處置欄：最終決定與「由規則引擎決定」、人做最後決定', () => {
    render(<DecisionCard result={blocked} />)
    expect(screen.getByText('暫緩出金並啟動人工審查')).toBeDefined()
    expect(screen.getByText(/由規則引擎決定/)).toBeDefined()
    expect(screen.getByText('人做最後決定。')).toBeDefined()
    expect(screen.queryByTestId('escalation')).toBeNull()
  })

  it('模型加註時醒目標示「規則放行 → 模型加註 → 加強審查」', () => {
    render(<DecisionCard result={escalated} />)
    const flow = screen.getByTestId('escalation')
    expect(flow.textContent).toContain('規則放行')
    expect(flow.textContent).toContain('模型加註')
    expect(flow.textContent).toContain('加強審查')
    expect(screen.getByText('0.19')).toBeDefined()
    expect(screen.getByText('0.98')).toBeDefined()
    expect(screen.getByText('加強審查（EDD）——由 GNN 模型加註')).toBeDefined()
  })

  it('沒有 GNN 模型時不會炸掉，顯示未載入', () => {
    render(<DecisionCard result={{ ...blocked, model: null }} />)
    expect(screen.getByText('未載入 GNN 模型。')).toBeDefined()
  })

  it('放行時顯示放行文案', () => {
    render(<DecisionCard result={{ ...blocked, decision: 'pass', rule_decision: 'pass', decision_zh: '予以放行', risk_score: 0.0962 }} />)
    expect(screen.getByText('予以放行')).toBeDefined()
  })
})

describe('DecisionCard 反事實橫幅（情境八）', () => {
  it('有 counterfactual 時顯示：若沒有實體標註 → 1.00 暫緩出金、30 名用戶全部連坐', () => {
    render(<DecisionCard result={exchangeUser} />)
    const banner = screen.getByTestId('counterfactual')
    expect(banner.textContent).toContain('若沒有實體標註')
    expect(banner.textContent).toContain('1.00')
    expect(banner.textContent).toContain('暫緩出金')
    expect(banner.textContent).toContain('30')
    expect(banner.textContent).toContain('名用戶全部連坐')
  })

  it('counterfactual 為 null 時不顯示橫幅', () => {
    render(<DecisionCard result={blocked} />)
    expect(screen.queryByTestId('counterfactual')).toBeNull()
  })
})
