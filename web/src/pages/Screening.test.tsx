import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { SCENARIOS_FALLBACK } from '../content/scenarios'
import Screening from './Screening'

// 只 mock postScreen／getScenarios；ApiError 用真的 class，因為頁面用 `instanceof ApiError` 判斷。
vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return { ...actual, postScreen: vi.fn(), getScenarios: vi.fn() }
})

// jsdom 沒有 2d canvas，cytoscape 初始化會丟例外；這支測試在意的是頁面狀態邏輯，不是圖譜。
vi.mock('../graph/GraphView', () => ({
  GraphView: () => null,
}))

import { getScenarios, postScreen } from '../api/client'

const mockedPostScreen = vi.mocked(postScreen)
const mockedGetScenarios = vi.mocked(getScenarios)

function renderPage(url = '/screening') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Screening />
    </MemoryRouter>,
  )
}

describe('Screening 離線快照保險網（I5）', () => {
  beforeEach(() => {
    mockedPostScreen.mockReset()
    mockedGetScenarios.mockReset()
    mockedGetScenarios.mockRejectedValue(new ApiError(0, '無法連線'))
  })

  it('完全無法連線（status 0）時退回離線快照', async () => {
    mockedPostScreen.mockRejectedValue(new ApiError(0, '無法連線到分析服務，請確認網路後重試。'))
    renderPage()
    screen.getByRole('button', { name: '執行出金審查' }).click()

    await waitFor(() => expect(screen.getByText('0.73')).toBeDefined())
    expect(screen.getByText(/離線快照/)).toBeDefined()
  })

  it('後端 5xx（例如冷啟動逾時的 504）也要退回離線快照', async () => {
    mockedPostScreen.mockRejectedValue(new ApiError(504, '分析服務回應異常（HTTP 504）。'))
    renderPage()
    screen.getByRole('button', { name: '執行出金審查' }).click()

    await waitFor(() => expect(screen.getByText('0.73')).toBeDefined())
    expect(screen.getByText(/離線快照/)).toBeDefined()
  })

  it('4xx（例如 API base 設錯導致的 404）不觸發快照，只顯示錯誤訊息', async () => {
    mockedPostScreen.mockRejectedValue(new ApiError(404, '查無資料。'))
    renderPage()
    screen.getByRole('button', { name: '執行出金審查' }).click()

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined())
    expect(screen.queryByText(/離線快照/)).toBeNull()
    expect(screen.queryByText('0.73')).toBeNull()
  })

  it('帶 ?auto=1 進頁時自動執行一次審查，不必按按鈕', async () => {
    mockedPostScreen.mockRejectedValue(new ApiError(0, '無法連線'))
    renderPage('/screening?auto=1')
    await waitFor(() => expect(mockedPostScreen).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('0.73')).toBeDefined())
  })

  it('沒有 auto 參數時不會自己送出查詢', () => {
    renderPage()
    expect(mockedPostScreen).not.toHaveBeenCalled()
  })
})

describe('Screening 情境列與網址參數', () => {
  beforeEach(() => {
    mockedPostScreen.mockReset()
    mockedGetScenarios.mockReset()
  })

  it('API 失敗時情境列退回內建八個情境', async () => {
    mockedGetScenarios.mockRejectedValue(new ApiError(0, '無法連線'))
    renderPage()
    const chips = screen.getAllByRole('radio')
    expect(chips).toHaveLength(8)
    expect(screen.getByRole('radio', { name: /快進快出中繼/ })).toBeDefined()
  })

  it('GET /scenarios 成功時以 API 回傳為準', async () => {
    mockedGetScenarios.mockResolvedValue([{ ...SCENARIOS_FALLBACK[0], title_zh: '來自 API 的情境' }])
    renderPage()
    await waitFor(() => expect(screen.getByRole('radio', { name: /來自 API 的情境/ })).toBeDefined())
    expect(screen.getAllByRole('radio')).toHaveLength(1)
  })

  it('?case=7&auto=1 直接以情境七的目標與金額執行審查', async () => {
    mockedGetScenarios.mockRejectedValue(new ApiError(0, '無法連線'))
    mockedPostScreen.mockRejectedValue(new ApiError(404, '查無資料。'))
    renderPage('/screening?case=7&auto=1')
    await waitFor(() => expect(mockedPostScreen).toHaveBeenCalledWith('TRelay03', 200000))
    expect(screen.getByRole('radio', { name: /快進快出中繼/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('點情境 chip 會切換目標、帶入該情境金額並直接審查', async () => {
    mockedGetScenarios.mockRejectedValue(new ApiError(0, '無法連線'))
    mockedPostScreen.mockRejectedValue(new ApiError(404, '查無資料。'))
    renderPage()
    screen.getByRole('radio', { name: /拆單規避固定門檻/ }).click()
    await waitFor(() => expect(mockedPostScreen).toHaveBeenCalledWith('TSplitOut01', 9000))
  })
})
