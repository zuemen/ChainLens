import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SCREENING_SNAPSHOT } from './api/snapshot'
import { DecisionCard } from './components/DecisionCard'
import { LangProvider, useLang } from './i18n'

function Toggle() {
  const { lang, setLang } = useLang()
  return (
    <button type="button" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}>
      toggle
    </button>
  )
}

describe('中英切換', () => {
  afterEach(() => window.localStorage.clear())

  it('預設（測試環境）為中文，切換後決策卡改用後端英文欄位', () => {
    render(
      <LangProvider>
        <Toggle />
        <DecisionCard result={SCREENING_SNAPSHOT} />
      </LangProvider>,
    )
    expect(screen.getByText('暫緩出金並啟動人工審查')).toBeTruthy()

    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByText('Hold withdrawal and start manual review')).toBeTruthy()
    expect(screen.getByText(/downstream of TAggregator01/)).toBeTruthy()
    expect(document.documentElement.lang).toBe('en')
    expect(window.localStorage.getItem('chainlens.lang')).toBe('en')
  })

  it('記住上次選擇的語言', () => {
    window.localStorage.setItem('chainlens.lang', 'en')
    render(
      <LangProvider>
        <DecisionCard result={SCREENING_SNAPSHOT} />
      </LangProvider>,
    )
    expect(screen.getByText('Two engines, one decision')).toBeTruthy()
  })

  it('舊版 API 沒有 *_en 欄位時退回中文，不顯示空白', () => {
    window.localStorage.setItem('chainlens.lang', 'en')
    const legacy = { ...SCREENING_SNAPSHOT, decision_en: undefined, narrative_en: undefined }
    render(
      <LangProvider>
        <DecisionCard result={legacy} />
      </LangProvider>,
    )
    expect(screen.getByText('暫緩出金並啟動人工審查')).toBeTruthy()
  })
})
