import { describe, expect, it } from 'vitest'
import { CASES, KEY_FACTS, MILESTONES, PAIN_POINTS, STRENGTHS, VASP_DEFENSE } from './briefing'

/** 給監理單位看的內容：每一筆事實都必須有可點開的來源 */
describe('briefing 內容', () => {
  const isUrl = (url: string) => /^https:\/\/[^\s]+\.[^\s]+/.test(url)

  it('關鍵數字都附來源網址', () => {
    for (const fact of KEY_FACTS) expect(isUrl(fact.source.url)).toBe(true)
  })

  it('監理時程都附來源網址，未來事項標示為預計', () => {
    for (const milestone of MILESTONES) {
      expect(isUrl(milestone.source.url)).toBe(true)
      if (milestone.upcoming) expect(milestone.when).toContain('預計')
    }
  })

  it('每件實際案例都有來源、資金流向與對應檢查點', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(3)
    for (const item of CASES) {
      expect(item.sources.length).toBeGreaterThan(0)
      for (const source of item.sources) expect(isUrl(source.url)).toBe(true)
      expect(item.flow.length).toBeGreaterThan(0)
      expect(item.checkpoints.length).toBeGreaterThan(0)
    }
    expect(isUrl(VASP_DEFENSE.source.url)).toBe(true)
  })

  it('每個痛點都有出處、解方，以及在本站哪裡看得到', () => {
    expect(PAIN_POINTS.length).toBe(6)
    for (const item of PAIN_POINTS) {
      expect(isUrl(item.source.url)).toBe(true)
      expect(item.solution.length).toBeGreaterThan(0)
      expect(item.seeIt.length).toBeGreaterThan(0)
    }
    expect(STRENGTHS.length).toBe(4)
  })
})
