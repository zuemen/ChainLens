import { describeError } from './errors'
import type { Scenario, ScreenResult, WorkbenchPayload } from './types'

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

/** Swagger 互動文件；API 與網站同源時就是 /docs */
export const API_DOCS_URL = `${API_BASE}/docs`

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(detail)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, init)
  } catch {
    throw new ApiError(0, describeError(0))
  }
  if (!response.ok) {
    const detail = await response
      .json()
      .then((payload: { detail?: unknown }) =>
        typeof payload.detail === 'string' ? payload.detail : undefined,
      )
      .catch(() => undefined)
    throw new ApiError(response.status, describeError(response.status, detail))
  }
  return (await response.json()) as T
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function postScreen(target: string, amountUsdt: number): Promise<ScreenResult> {
  return post<ScreenResult>('/screen', {
    target,
    amount_usdt: amountUsdt,
    request_id: 'DEMO-2026-001',
  })
}

/** 八個示範情境的定義（與後端 scenario.SCENARIOS 同一份）；失敗時由呼叫端退回內建常數 */
export function getScenarios(): Promise<Scenario[]> {
  return request<Scenario[]>('/scenarios')
}

export function postGraph(body: {
  mode: 'example' | 'scenario' | 'tron'
  address?: string
}): Promise<WorkbenchPayload> {
  return post<WorkbenchPayload>('/graph', body)
}

/** 背景喚醒 serverless 函式。冷啟動實測約 5 秒，趁使用者閱讀時吃掉。 */
export function warmUp(): void {
  void fetch(`${API_BASE}/health`).catch(() => undefined)
}

/** 分析服務是否可用，供首頁的即時狀態指示使用。 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`)
    return response.ok
  } catch {
    return false
  }
}
