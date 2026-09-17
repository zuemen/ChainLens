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
