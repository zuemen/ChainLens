/** 洗錢圖樣代碼 → 中文名稱（與 API 的 motif 欄位對應） */
export const MOTIF_ZH: Record<string, string> = {
  fan_in: '集資扇入',
  fan_out: '快速分散',
  gather_scatter: '集散（smurfing）',
  peeling_chain: '剝洋蔥鏈',
}

/** 洗錢圖樣代碼 → 英文名稱 */
export const MOTIF_EN: Record<string, string> = {
  fan_in: 'fan-in collection',
  fan_out: 'rapid fan-out',
  gather_scatter: 'gather-scatter (smurfing)',
  peeling_chain: 'peeling chain',
}
