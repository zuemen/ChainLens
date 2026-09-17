import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CaseReplay } from './CaseReplay'

function renderReplay() {
  return render(
    <MemoryRouter>
      <CaseReplay />
    </MemoryRouter>,
  )
}

describe('CaseReplay', () => {
  it('第一幕說明名單比對會放行', () => {
    renderReplay()
    expect(screen.getByText(/名單比對的結果：放行/)).toBeDefined()
  })

  it('可逐幕前進，最後一幕給出暫緩出金並可重播', () => {
    renderReplay()
    const next = screen.getByRole('button', { name: '下一幕' })
    for (let i = 0; i < 5; i++) fireEvent.click(next)
    expect(screen.getByText('暫緩出金，啟動人工審查')).toBeDefined()
    expect(screen.getByRole('button', { name: '重播' })).toBeDefined()
    expect((next as HTMLButtonElement).disabled).toBe(true)
  })

  it('分數取自與 API 相同的劇本資料', () => {
    renderReplay()
    expect(screen.getByText('0.73')).toBeDefined()
    expect(screen.getByText('0.33')).toBeDefined()
    expect(screen.getByText('0.60')).toBeDefined()
  })

  it('明示為合成劇本的重演，並導向即時審查', () => {
    renderReplay()
    expect(screen.getByText(/合成劇本資料/)).toBeDefined()
    expect(screen.getByRole('link', { name: '親手執行一次即時審查' }).getAttribute('href')).toBe('/screening?auto=1')
  })
})
