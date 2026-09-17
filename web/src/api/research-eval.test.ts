import { describe, expect, it } from 'vitest'
import { RESEARCH_EVAL } from '../components/StepF1Chart'

/** 研究頁的逐期圖與頁面上的指標表必須是同一次結果；檢查點重算若漂移，這裡會紅燈 */
describe('research-eval.json（由檢查點重算）', () => {
  const byKey = Object.fromEntries(RESEARCH_EVAL.models.map((model) => [model.key, model]))

  it('整體 F1 與研究頁、README、簡報上的數字一致', () => {
    expect(byKey.rf.f1.toFixed(3)).toBe('0.806')
    expect(byKey['sage-rmp'].f1.toFixed(3)).toBe('0.661')
    expect(byKey.gcn.f1.toFixed(3)).toBe('0.506')
  })

  it('逐期資料涵蓋測試期第 35–49 期，且各模型期別一致', () => {
    for (const model of RESEARCH_EVAL.models) {
      expect(model.per_step.map((point) => point.t)).toEqual(Array.from({ length: 15 }, (_, i) => 35 + i))
    }
  })

  it('逐期非法筆數加總等於測試集非法總數', () => {
    const total = RESEARCH_EVAL.models[0].per_step.reduce((sum, point) => sum + point.illicit, 0)
    expect(total).toBe(RESEARCH_EVAL.test_illicit)
  })
})
