import { getLang } from '../i18n'

/** HTTP 狀態碼 → 使用者看得懂的訊息。後端有給 detail 時優先採用（後端訊息為中文，英文介面改用下表）。 */
export function describeError(status: number, detail?: string): string {
  const en = getLang() === 'en'
  if (detail && !en) return detail
  switch (status) {
    case 0:
      return en ? 'Cannot reach the analysis service. Check your connection and try again.' : '無法連線到分析服務，請確認網路後重試。'
    case 400:
      return en ? 'Invalid request parameters.' : '請求參數不正確。'
    case 401:
      return en ? 'Missing or invalid API key.' : '缺少或不正確的 API 金鑰。'
    case 404:
      return en ? 'No data found.' : '查無資料。'
    case 422:
      return en ? 'Invalid input format.' : '輸入格式不正確。'
    case 429:
      return en ? 'Too many requests — please wait a moment and try again.' : (detail ?? '請求過於頻繁，請稍後再試。')
    case 502:
      return en ? 'The on-chain lookup timed out or failed; you can continue with the built-in example graph.' : '鏈上查詢逾時或失敗，可改用內建範例圖繼續。'
    default:
      return en ? `The analysis service returned an error (HTTP ${status}).` : `分析服務回應異常（HTTP ${status}）。`
  }
}
