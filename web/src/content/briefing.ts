/**
 * 首頁「監理背景」與「實際案例」的內容。
 * 每一筆都必須附公開來源；數字一律照來源原文，不推算、不四捨五入成更好看的數字。
 * 查證紀錄：docs/decisions/2026-09-18-briefing-sources.md
 */

export interface Source {
  label: string
  url: string
}

export interface KeyFact {
  value: string
  unit: string
  label: string
  source: Source
}

export const KEY_FACTS: KeyFact[] = [
  {
    value: '893',
    unit: '億元',
    label: '2025 年全臺詐騙財損（受理 16.2 萬件）',
    source: {
      label: '165 打詐儀錶板，台視 2026-01-19 報導',
      url: 'https://tw.news.yahoo.com/2025%E5%B9%B4%E5%85%A8%E5%8F%B0%E8%A9%90%E9%A8%99%E8%B2%A1%E6%90%8D%E8%BF%91900%E5%84%84-165%E6%89%93%E8%A9%90%E5%84%80%E9%8C%B6%E6%9D%BF%E6%8F%AD%E6%9C%80%E5%B8%B8%E8%A6%8B%E6%89%8B%E6%B3%95-092531701.html',
    },
  },
  {
    value: '10',
    unit: '家',
    label: '完成洗錢防制登記的虛擬資產服務業者（VASP）',
    source: { label: '聯合報 2026-09-03（金管會公布）', url: 'https://udn.com/news/story/7239/9732658' },
  },
  {
    value: '17',
    unit: '家',
    label: '2023–2025 年金管會累計金檢的 VASP，已對 11 家開罰；缺失包括「未深入評估被通報客戶之間的交易行為與提幣資金流向關聯性」',
    source: {
      label: '資安人 2025-11-25',
      url: 'https://www.informationsecurity.com.tw/article/article_detail.aspx?aid=12488',
    },
  },
]

export interface Milestone {
  when: string
  what: string
  source: Source
  upcoming?: boolean
}

export const MILESTONES: Milestone[] = [
  {
    when: '2025 年 9 月',
    what: '金管會公告首批 9 家完成洗錢防制登記的 VASP，未登記者不得營業',
    source: {
      label: '金管會新聞稿 2025-09-22',
      url: 'https://www.fsc.gov.tw/ch/home.jsp?id=96&parentpath=0%2C2&mcustomize=news_view.jsp&dataserno=202509220001&dtable=News',
    },
  },
  {
    when: '2026 年 6 月 30 日',
    what: '《虛擬資產服務法》三讀：VASP 改採許可制，既有業者須於施行後 12 個月內申請',
    source: {
      label: '金管會新聞稿 2026-06-30',
      url: 'https://www.fsc.gov.tw/ch/home.jsp?id=96&parentpath=0%2C2&mcustomize=news_view.jsp&dataserno=202606300002&dtable=News',
    },
  },
  {
    when: '2026 年 9 月',
    what: '新增 2 家完成登記，合計 10 家',
    source: { label: '聯合報 2026-09-03', url: 'https://udn.com/news/story/7239/9732658' },
  },
  {
    when: '2026 年 10 月（預計）',
    what: '旅行規則（Travel Rule）第一階段：境內 VASP 間轉帳須傳遞收付款人資訊',
    source: { label: '經濟日報 2026-08-04', url: 'https://money.udn.com/money/story/5613/9670876' },
    upcoming: true,
  },
  {
    when: '2027 年底（預計）',
    what: '旅行規則第二階段：擴及境外 VASP',
    source: { label: '經濟日報 2026-08-04', url: 'https://money.udn.com/money/story/5613/9670876' },
    upcoming: true,
  },
]

export interface Case {
  id: string
  title: string
  authority: string
  scale: string
  /** 資金流向，依時間順序；照報導內容，不自行補充 */
  flow: string[]
  /** 這個手法在鏈鏡裡對應的檢查點（不代表鏈鏡曾偵辦或偵測此案） */
  checkpoints: string[]
  sources: Source[]
}

export const CASES: Case[] = [
  {
    id: 'bixiang',
    title: '幣想科技案：幣商涉協助詐團洗錢',
    authority: '士林地方法院 2026-07-16 一審宣判（可上訴）',
    scale: '受騙金額新臺幣 12 億 7,500 萬餘元、被害人 1,539 人；洗錢金額逾 23 億元',
    flow: ['資金換成美元轉往海外', '被害人被誘導將 USDT 轉入指定冷錢包', '層層轉移製造斷點'],
    checkpoints: ['剝洋蔥鏈（逐層轉手）', '出金目標的上游關聯追溯'],
    sources: [
      { label: '中央社 2026-07-16', url: 'https://www.cna.com.tw/news/asoc/202607160137.aspx' },
      { label: '自由時報', url: 'https://news.ltn.com.tw/news/society/breakingnews/5507272' },
    ],
  },
  {
    id: 'pingtung',
    title: '屏東泰達幣洗錢集團：車手款項集中到單一錢包，再匯往境外',
    authority: '屏東地方檢察署偵辦，四波掃蕩逮捕 36 人（聯合報 2026-04-21）',
    scale: '跨國洗錢 1.46 億元、至少 187 名民眾受騙；8 個多月經手 489 萬餘顆 USDT',
    flow: ['車手團隊扣除約 7% 報酬', '其餘轉入洗錢者的虛擬貨幣錢包', '扣除約 1% 後，92% 轉匯境外詐團首腦錢包'],
    checkpoints: ['集資扇入（多個來源匯入單一錢包）', '集散（先集中、再分散）'],
    sources: [{ label: '聯合報 2026-04-21', url: 'https://udn.com/news/story/124490/9454519' }],
  },
  {
    id: 'hengfeng',
    title: '「交易幣修課」假投資 App：引導被害人買 USDT',
    authority: '刑事警察局偵查第七大隊偵辦，移送臺北地方檢察署（2026-09-16 公布）',
    scale: '46 名被害人、財損超過 5,869 萬元，查獲 26 名嫌犯',
    flow: ['被害人在假投資 App 投入 USDT', '人頭公司以地下匯兌及幣商交易轉移', '再經去中心化電子錢包轉移資金'],
    checkpoints: ['快速分散（一對多拆分）', '剝洋蔥鏈（多層轉手）'],
    sources: [
      { label: '動區動趨', url: 'https://www.blocktempo.com/taiwan-youtube-crypto-mentor-scam-ring-gang-accountant-usdt-laundering/' },
      { label: '壹蘋新聞網 2026-09-16', url: 'https://news.nextapple.com/local/20260916/96EDA7E5A35F567BF28BB31F69DC20BE' },
    ],
  },
]

/** VASP 已是實際防線的佐證：交易所與刑事局聯防返還被害款 */
export const VASP_DEFENSE = {
  title: '交易所已是防詐前線：與刑事局合作凍結並返還被害款',
  body: '《詐欺犯罪危害防制條例》公布後，刑事局與多家虛擬貨幣業者合作；2025 年 1 月公布，依打詐新法凍結並返還 32 位被害人共 1,113 萬元，是國內首度免透過司法程序、直接由交易所返還被害人資產。',
  gap: '聯防靠的是「已被通報」的帳戶。從未被通報、但資金來自詐騙網路的出金地址，正是鏈鏡要補上的缺口。',
  source: { label: 'TVBS 2025-01-22', url: 'https://news.tvbs.com.tw/local/2758583' },
}

export interface PainPoint {
  pain: string
  evidence: string
  source: Source
  solution: string
  /** 在網站哪裡可以親眼看到 */
  seeIt: string
  /** 對應的出金審查情境編號（點痛點直接跳 /screening?case=N&auto=1） */
  scenario: number
}

/**
 * 八個監理與業者痛點，各對應一個出金審查情境。evidence 一律照來源原文或數字。
 * 痛點 7、8 的佐證只用我們自己的劇本數字與反事實實驗，以及 Elliptic 第 43 期實驗；不引用查不到一手來源的業界數字。
 */
export const PAIN_POINTS: PainPoint[] = [
  {
    pain: '黑名單永遠慢一步',
    evidence: '現行聯防凍結靠的是「已被通報」的帳戶；詐騙地址用過即丟，通報時錢已經轉走。',
    source: { label: 'TVBS 2025-01-22（刑事局與交易所聯防）', url: 'https://news.tvbs.com.tw/local/2758583' },
    solution: '不靠名單：把 4 類洗錢手法寫成圖樣主動掃描，再從出金地址往上游追溯。地址從未被通報也攔得到。',
    seeIt: '出金審查・情境一',
    scenario: 1,
  },
  {
    pain: '金檢點名：沒有評估提幣資金流向',
    evidence: '金管會 2023–2025 年金檢 17 家 VASP、已對 11 家開罰，缺失包括「未深入評估被通報客戶之間的交易行為與提幣資金流向關聯性」。',
    source: { label: '資安人 2025-11-25', url: 'https://www.informationsecurity.com.tw/article/article_detail.aspx?aid=12488' },
    solution: '在出金當下自動追溯最多 4 層上游，約 1 秒回傳完整資金路徑與關聯階數，留下「評估過」的證據。',
    seeIt: '出金審查・情境二（3 階追溯，關聯 0.36）',
    scenario: 2,
  },
  {
    pain: '監控門檻是固定金額',
    evidence: '同一份金檢指出「多數業者設定的可疑交易態樣監控金額門檻均為固定數值」。',
    source: { label: '資安人 2025-11-25', url: 'https://www.informationsecurity.com.tw/article/article_detail.aspx?aid=12488' },
    solution: '風險分數看資金結構、不看金額大小；並分暫緩出金／加強審查／放行三級，而不是一刀切。',
    seeIt: '出金審查・情境六（拆單，9,000 USDT 也攔）',
    scenario: 6,
  },
  {
    pain: '可疑交易申報量一年倍增',
    evidence: '調查局 113 年洗錢防制工作年報：虛擬通貨業可疑交易報告 918 件，前一年 447 件。',
    source: { label: '加密城市 2025-11-04（引調查局年報）', url: 'https://www.cryptocity.tw/news/suspected-money-laundering-hong-company-report' },
    solution: '自動產出可疑交易申報（STR）草稿：可疑事由、逐筆金額與時間、完整路徑，法遵人員審閱修訂即可。',
    seeIt: '出金審查・情境三（STR 草稿可下載）',
    scenario: 3,
  },
  {
    pain: '穩定幣是非法金流的主要載體',
    evidence: 'FATF 2026 年報告引 Chainalysis：穩定幣占 2025 年非法虛擬資產交易量 84%，且常涉及非託管錢包——旅行規則管不到的地方。',
    source: { label: 'FATF Targeted Report on Stablecoins and Unhosted Wallets', url: 'https://www.fatf-gafi.org/en/publications/Virtualassets/targeted-report-stablecoins-unhosted-wallets.html' },
    solution: '直接分析 TRON 鏈上的 USDT 金流，不需要對方業者提供任何資訊；與旅行規則互補。',
    seeIt: '出金審查・情境五（鏈上 USDT 金流直接判讀）',
    scenario: 5,
  },
  {
    pain: 'AI 黑箱難以向監理與司法說明',
    evidence: '金管會《金融業運用人工智慧（AI）指引》核心原則五：落實透明性與可解釋性。',
    source: { label: '證交所市場觀點（金管會 AI 指引六大原則）', url: 'https://www.twse.com.tw/market_insights/zh/detail/8a8216d6904d181101905e34532c006e' },
    solution: '每個判定都附命中的圖樣、關聯階數與資金路徑；規則與程式碼全部公開，最終決定權在法遵人員。',
    seeIt: '出金審查・情境四（被害人為何放行，理由列得出來）',
    scenario: 4,
  },
  {
    pain: '手法一變，寫死的規則就失效',
    evidence: '劇本情境七：中繼地址一進一出、金額原封不動往下傳，四類規則圖樣一個都沒命中，規則引擎綜合 0.19 判放行。Elliptic 第 43 期實驗也顯示，單押任何一個模型，手法一變就同時失效。',
    source: { label: '本專案劇本定義 chainlens/data/scenario.py（情境七）', url: 'https://github.com/zuemen/ChainLens/blob/main/chainlens/data/scenario.py' },
    solution: '第二引擎：GraphSAGE 結構模型讀 13 個結構特徵，判 0.98，把「放行」升為「加強審查」。模型只能升不能降，人做最後決定。',
    seeIt: '出金審查・情境七（規則 0.19 → 模型 0.98）',
    scenario: 7,
  },
  {
    pain: '誤報拖垮人工審查量，也趕跑正常用戶',
    evidence: '本專案反事實實驗：拿掉實體標註後，情境八的交易所熱錢包批次出金被當成快速分散，規則綜合 1.00 暫緩出金，同一批 30 名用戶全部連坐。',
    source: { label: '本專案反事實實作 chainlens/api/main.py', url: 'https://github.com/zuemen/ChainLens/blob/main/chainlens/api/main.py' },
    solution: '已標註實體（交易所熱錢包）的批次出金不計入洗錢圖樣；規則 0.02、模型 0.10，放行。畫面同時顯示反事實，誤報有多嚴重看得見。',
    seeIt: '出金審查・情境八（反事實橫幅）',
    scenario: 8,
  },
]

/** 鏈鏡的四個強項：每一項都能在 Demo 裡驗證 */
export const STRENGTHS = [
  { title: '不靠黑名單', body: '從未被通報的地址，也能沿資金路徑攔下。', proof: '情境一：自身 0.33、關聯 0.60 → 綜合 0.73 暫緩出金' },
  { title: '每個判定都可稽核', body: '圖樣、階數、路徑、逐筆金額與時間，全部列給你看。', proof: '13 條關聯證據、完整 STR 草稿' },
  { title: '不誤傷被害人與正常用戶', body: '資金來源方不加風險分，結構偵測不是寧可錯殺。', proof: '12 位被害人、5 位正常用戶全數放行' },
  { title: '三級處置，不是一刀切', body: '暫緩出金、加強審查、放行，依風險距離分級。', proof: '情境二：3 階關聯 0.53 → 加強審查' },
]
