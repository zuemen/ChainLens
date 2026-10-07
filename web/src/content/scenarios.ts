import type { Decision, Scenario } from '../api/types'

/**
 * 八個示範情境的內建常數：與後端 `chainlens/data/scenario.py` 的 SCENARIOS 逐字相同（含 *_en 英文版）。
 * 正常路徑用 GET /scenarios；API 失敗（斷網、冷啟動逾時）時退回這份，情境列不會空白。
 * 分數與處置一律以 POST /screen 回傳為準，這裡只放 expect（預期處置，供 chip 色點）。
 */
export const SCENARIOS_FALLBACK: Scenario[] = [
  {
    id: 1,
    target: 'TOtcOut01',
    title_zh: '乾淨的地址，髒的上游',
    summary_zh: '用戶申請把 50 萬 USDT 提領到一個從未被通報、不在任何黑名單上的地址。',
    pain_zh: '黑名單永遠慢一步；金檢要求評估提幣資金流向',
    title_en: 'Clean address, dirty upstream',
    summary_en: 'A user asks to withdraw 500,000 USDT to an address that has never been reported and is on no blacklist.',
    pain_en: 'Blacklists are always a step behind; examiners expect withdrawal fund flows to be assessed',
    amount_usdt: 500000,
    expect: 'block',
  },
  {
    id: 2,
    target: 'TDownstream01',
    title_zh: '贓款再轉一手',
    summary_zh: 'OTC 出金地址收到贓款後，再轉給一個全新地址；用戶要提領到這個第三階地址。',
    pain_zh: '單一固定門檻無法分級處置',
    title_en: 'Stolen funds moved one more hop',
    summary_en: 'After receiving stolen funds, the OTC cash-out address forwards them to a brand-new address; the user withdraws to this third-hop address.',
    pain_en: 'A single fixed threshold cannot grade the response',
    amount_usdt: 500000,
    expect: 'review',
  },
  {
    id: 3,
    target: 'TMule03',
    title_zh: '車手地址直接出金',
    summary_zh: '提領目標本身就是洗錢執行層的車手地址，但因為是新地址，尚未被任何單位通報。',
    pain_zh: '詐騙地址用過即丟，來不及被通報',
    title_en: 'Withdrawal straight to a mule',
    summary_en: 'The destination is itself a money-mule address in the laundering layer, but it is new and has not been reported by anyone yet.',
    pain_en: 'Fraud addresses are used once and discarded before anyone can report them',
    amount_usdt: 500000,
    expect: 'block',
  },
  {
    id: 4,
    target: 'TVictim01',
    title_zh: '被害人不連坐',
    summary_zh: '提領目標是一位被害人的地址——曾把錢匯給詐團，但資金來源方不該被加分。',
    pain_zh: '寧可錯殺的風控會傷害被害人與正常用戶',
    title_en: 'Victims are not penalised',
    summary_en: 'The destination belongs to a victim — someone who sent money to the scammers. Being a source of funds should not raise their risk.',
    pain_en: 'Better-safe-than-sorry controls end up hurting victims and ordinary users',
    amount_usdt: 500000,
    expect: 'pass',
  },
  {
    id: 5,
    target: 'TNormalUser01',
    title_zh: '正常用戶',
    summary_zh: '對照組：同一套引擎、同樣 50 萬 USDT，提領到一個只有日常小額往來的地址。',
    pain_zh: '對照組',
    title_en: 'Ordinary user',
    summary_en: 'Control case: same engine, same 500,000 USDT, withdrawn to an address with only small everyday transfers.',
    pain_en: 'Control case',
    amount_usdt: 500000,
    expect: 'pass',
  },
  {
    id: 6,
    target: 'TSplitOut01',
    title_zh: '拆單規避固定門檻',
    summary_zh: '這筆只申請 9,000 USDT，低於業者的固定監控門檻；但同一地址 40 分鐘內已從 11 個地址各收 9,000。',
    pain_zh: '監控門檻是固定金額，拆單就繞得過',
    title_en: 'Splitting to dodge a fixed threshold',
    summary_en: "This request is only 9,000 USDT, below the platform's fixed monitoring threshold — yet within 40 minutes the same address has received 9,000 each from 11 addresses.",
    pain_en: 'Monitoring thresholds are fixed amounts, so splitting gets around them',
    amount_usdt: 9000,
    expect: 'block',
  },
  {
    id: 7,
    target: 'TRelay03',
    title_zh: '快進快出中繼',
    summary_zh: '目標地址一進一出、每次停留不到十分鐘、金額原封不動往下傳；沒有任何規則圖樣能命中。',
    pain_zh: '手法一變，寫死的規則就失效',
    title_en: 'Fast in-out relay',
    summary_en: 'The address takes funds in and passes them straight on, holding each for under ten minutes with the amount untouched. No rule pattern matches.',
    pain_en: 'Change the technique and hard-coded rules stop working',
    amount_usdt: 200000,
    expect: 'review',
  },
  {
    id: 8,
    target: 'TExchUser07',
    title_zh: '交易所熱錢包批次出金的用戶',
    summary_zh: '某交易所熱錢包在 20 分鐘內對 30 名用戶批次出金，結構上像極了洗錢的快速分散。',
    pain_zh: '誤報拖垮人工審查量，也趕跑正常用戶',
    title_en: 'User paid by an exchange hot-wallet batch',
    summary_en: 'An exchange hot wallet pays out to 30 users within 20 minutes — structurally almost identical to a laundering fan-out.',
    pain_en: 'False positives swamp manual review and drive away legitimate users',
    amount_usdt: 3000,
    expect: 'pass',
  },
]

/** 劇本角色 → 中文（與後端 scenario.ROLE_ZH 同一份；API 已帶 role_zh，這裡供圖例與欄位標題用） */
export const ROLE_ZH: Record<string, string> = {
  victim: '被害人',
  support: '客服收款地址',
  aggregator: '集資主錢包',
  mule: '車手地址',
  peel: '剝洋蔥中繼',
  peel_side: '剝離小額地址',
  otc: 'OTC 出金地址',
  normal: '正常交易地址',
  downstream: '下游收款地址',
  smurf: '拆單人頭地址',
  split_collector: '拆單整合地址',
  relay: '快進快出中繼',
  hot_wallet: '交易所熱錢包（已標註實體）',
  exchange_user: '交易所用戶',
}

/** 劇本角色 → 英文（與後端 scenario.ROLE_EN 同一份） */
export const ROLE_EN: Record<string, string> = {
  victim: 'Victim',
  support: 'Fake support collection address',
  aggregator: 'Collection master wallet',
  mule: 'Money-mule address',
  peel: 'Peeling-chain relay',
  peel_side: 'Peeled-off small address',
  otc: 'OTC cash-out address',
  normal: 'Ordinary address',
  downstream: 'Downstream recipient',
  smurf: 'Smurfing nominee address',
  split_collector: 'Split-deposit collector',
  relay: 'Fast in-out relay',
  hot_wallet: 'Exchange hot wallet (labelled entity)',
  exchange_user: 'Exchange user',
}

/** 已標註實體的角色：圖上用 --model 色描邊，因為「是否已標註實體」是 GNN 模型的第 13 個特徵 */
export const ENTITY_ROLES = new Set(['hot_wallet'])

export const DECISION_ZH: Record<Decision, string> = {
  block: '暫緩出金',
  review: '加強審查',
  pass: '放行',
}

export const DECISION_EN: Record<Decision, string> = {
  block: 'Hold',
  review: 'Enhanced review',
  pass: 'Release',
}

/** 三級處置各自的色 token（CSS 變數名） */
export const DECISION_COLOR: Record<Decision, string> = {
  block: 'var(--color-signal)',
  review: 'var(--color-review)',
  pass: 'var(--color-pass)',
}

/** 情境 6～8 的目標角色沒有洗錢三階段欄位，改用以目標為中心的焦點版面 */
export const FOCUS_LAYOUT_IDS = new Set([6, 7, 8])
