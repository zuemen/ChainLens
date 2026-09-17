import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { checkHealth } from '../api/client'
import { CaseReplay } from '../components/CaseReplay'

const STEPS = [
  {
    title: '圖樣掃描',
    body: '集資扇入、快速分散、集散（smurfing）、剝洋蔥鏈——4 類洗錢手法寫成可比對的圖樣，主動掃出命中節點。',
  },
  {
    title: 'k 階關聯追溯',
    body: '自出金目標沿資金流反向搜尋，最多 4 階，找出上游的圖樣命中節點與完整路徑。',
  },
  {
    title: '風險融合',
    body: '每遠一階，風險打六折；再與地址自身的結構分數融合，自身乾淨但上游髒的也攔得到。',
  },
  {
    title: '處置與 STR 草稿',
    body: '≥0.7 暫緩出金、≥0.4 加強審查、其餘放行。同時產出含逐跳金額與時間戳的申報草稿。',
  },
]

const COMPARE = [
  { label: '回答的問題', blacklist: '地址是否已被通報', travel: '收款人是誰', us: '錢從哪裡來、流向哪裡' },
  { label: '全新詐騙地址', blacklist: '攔不住', travel: '身分資訊不揭露資金來源', us: '沿資金路徑追溯 k 階關聯' },
  { label: '輸出', blacklist: '命中／未命中', travel: '交易雙方身分資訊', us: '三級處置＋證據鏈＋STR 草稿' },
]

const METRICS = [
  { value: '0.806', label: 'Random Forest F1', note: 'Elliptic 公開資料集，illicit 類別，官方時間切分' },
  { value: '203,769', label: '基準資料節點數', note: 'Elliptic 比特幣交易圖' },
  { value: '795', label: '真實鏈上實測節點', note: '以 TronGrid 擷取真實 TRON 地址的 USDT 2 階金流圖（本機實測；公開站為保護 API 額度停用即時查詢）' },
  { value: '147', label: '自動化測試', note: 'pytest 101＋vitest 46，GitHub Actions CI' },
]

const DONE = [
  '4 類洗錢圖樣偵測',
  '出金審查引擎與 STR 草稿',
  'SNA 指標與 Louvain 社群偵測',
  'GCN／GraphSAGE／Random Forest 基準',
  'REST API、Web 介面、Streamlit 工作台',
]

const ROADMAP = [
  '判定證據持久化稽核留存',
  '混幣服務偵測',
  'Neo4j 圖資料庫（現為記憶體圖）',
  '比特幣／以太坊即時擷取',
  '臺灣在地標註資料集',
]

function ServiceStatus() {
  const [online, setOnline] = useState<boolean | null>(null)
  useEffect(() => {
    void checkHealth().then(setOnline)
  }, [])

  const color = online === null ? '#A8A294' : online ? '#4ADE80' : '#FBBF24'
  const text = online === null ? '檢查分析服務…' : online ? '分析服務運作中' : '分析服務未回應'

  return (
    <span className="inline-flex items-center gap-2 text-sm" style={{ color }}>
      {/* 狀態不只靠顏色傳達，同時有文字說明 */}
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {text}
    </span>
  )
}

function SectionHead({ index, kicker, title }: { index: string; kicker: string; title: string }) {
  return (
    <div>
      <div className="kicker">
        {index} <span className="ml-2 font-sans font-medium tracking-wide text-muted">{kicker}</span>
      </div>
      <h2 className="mt-3 text-3xl font-black leading-snug md:text-[2.6rem]">{title}</h2>
    </div>
  )
}

export default function Landing() {
  return (
    <div>
      {/* ── 主視覺：一句話定位，緊接案件重演；兩者合計要在一屏內（含 1280×720 投影） ── */}
      <section className="on-dark bg-dark text-on-dark">
        <div className="reveal mx-auto flex max-w-6xl 2xl:max-w-7xl flex-wrap items-center gap-x-10 gap-y-3 px-6 pb-4 pt-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-5xl font-black leading-none tracking-wider md:text-6xl">鏈鏡</h1>
            <span className="tabular tracking-wider text-on-dark-muted">ChainLens</span>
          </div>
          <p className="font-serif text-lg font-bold leading-snug md:text-xl">
            Travel Rule 查「收款人是誰」
            <br />
            <span className="text-signal">鏈鏡查「這筆錢流向哪裡」</span>
          </p>
          <div className="ml-auto">
            <ServiceStatus />
          </div>
        </div>
      </section>
      <CaseReplay />

      {/* ── 運作方式 ── */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-6xl 2xl:max-w-7xl px-6 py-16">
          <SectionHead index="01" kicker="分析方法" title="由手法找地址，再沿資金路徑傳導風險" />
          <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-8">
            <div className="absolute left-3 right-3 top-3 hidden h-0.5 bg-signal md:block" aria-hidden="true" />
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative md:pt-12">
                <span className="absolute left-0 top-0 hidden h-6 w-6 rounded-full border-4 border-signal bg-panel md:block" aria-hidden="true" />
                <div className="kicker">STEP {index + 1}</div>
                <h3 className="mt-2 font-serif text-2xl font-bold">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 grid gap-10 md:grid-cols-2">
            <div className="border-t-2 border-ink pt-5">
              <h3 className="font-serif text-xl font-bold">被害人不連坐</h3>
              <p className="mt-2 leading-relaxed text-muted">
                集資扇入的資金來源方是被害人，不加風險分。劇本圖 12 位被害人、5 位正常用戶全數判為低風險。
              </p>
            </div>
            <div className="border-t-2 border-ink pt-5">
              <h3 className="font-serif text-xl font-bold">洗錢執行層不漂白</h3>
              <p className="mt-2 leading-relaxed text-muted">
                快速分散的下游車手、剝洋蔥鏈的中繼地址一併標為風險節點。劇本圖 6 個車手、12 個中繼全數判為高風險。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 差異 ── */}
      <section className="mx-auto max-w-6xl 2xl:max-w-7xl px-6 py-16">
        <SectionHead index="02" kicker="定位" title="把防線，從名單推進到資金結構" />
        <div className="mt-10 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="font-serif text-lg">
                <th className="border-b-2 border-ink p-4" />
                <th className="border-b-2 border-ink p-4 font-bold">黑名單比對</th>
                <th className="border-b-2 border-ink p-4 font-bold">Travel Rule</th>
                <th className="border-b-2 border-signal bg-ink p-4 font-bold text-on-dark">鏈鏡 ChainLens</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="border-b border-line p-4 text-sm font-normal text-muted">{row.label}</th>
                  <td className="border-b border-line p-4">{row.blacklist}</td>
                  <td className="border-b border-line p-4">{row.travel}</td>
                  <td className="border-b border-[#3a372f] bg-ink p-4 font-medium text-on-dark">{row.us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 space-y-6 md:hidden">
          {COMPARE.map((row) => (
            <div key={row.label} className="border-t-2 border-ink pt-3">
              <div className="text-sm text-muted">{row.label}</div>
              <dl className="mt-2 space-y-2">
                <div className="bg-ink p-3 text-on-dark"><dt className="text-xs text-on-dark-muted">鏈鏡 ChainLens</dt><dd className="font-medium">{row.us}</dd></div>
                <div><dt className="text-xs text-muted">黑名單比對</dt><dd>{row.blacklist}</dd></div>
                <div><dt className="text-xs text-muted">Travel Rule</dt><dd>{row.travel}</dd></div>
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl border-l-4 border-signal pl-5 leading-relaxed text-muted">
          <strong className="text-ink">互補，而非取代。</strong>
          Travel Rule（旅行規則）要求業者在轉帳時交換收付款人的身分資訊，回答的是「收款人是誰」；
          資金流向的關聯，仍需要結構分析補上。
        </p>
      </section>

      {/* ── 驗證 ── */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-6xl 2xl:max-w-7xl px-6 py-16">
          <SectionHead index="03" kicker="驗證" title="公開資料集基準，任何人都能重現" />
          <dl className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric) => (
              <div key={metric.label} className="border-t border-line-strong pt-5">
                <dd className="font-serif text-5xl font-black leading-none">{metric.value}</dd>
                <dt className="mt-3 font-bold">{metric.label}</dt>
                <dd className="mt-1 leading-relaxed text-muted">{metric.note}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-sm text-muted">
            完整模型比較與消融實驗見{' '}
            <Link to="/research" className="underline underline-offset-4 hover:text-ink">
              研究成果
            </Link>
            。
          </p>
        </div>
      </section>

      {/* ── 現況與藍圖 ── */}
      <section className="mx-auto max-w-6xl 2xl:max-w-7xl px-6 py-16">
        <SectionHead index="04" kicker="現況" title="已經跑得起來的，與接下來要做的" />
        <p className="mt-5 max-w-3xl leading-relaxed text-muted">
          出金審查 Demo 使用合成劇本資料；尚無商業客戶導入。原始碼、測試與實測數據全部公開。
        </p>
        <div className="mt-10 grid gap-12 md:grid-cols-2">
          <div>
            <h3 className="flex items-baseline justify-between border-b-2 border-risk-low pb-3 text-lg font-bold text-risk-low">
              已實作 <span className="text-sm font-medium">現在就能操作</span>
            </h3>
            <ul>
              {DONE.map((item) => (
                <li key={item} className="flex gap-3 border-b border-line py-3.5">
                  <span className="text-risk-low" aria-hidden="true">●</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="flex items-baseline justify-between border-b-2 border-signal-ink pb-3 text-lg font-bold text-signal-ink">
              發展藍圖 <span className="text-sm font-medium">尚未實作</span>
            </h3>
            <ul>
              {ROADMAP.map((item) => (
                <li key={item} className="flex gap-3 border-b border-line py-3.5 text-muted">
                  <span className="text-signal-ink" aria-hidden="true">○</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 行動呼籲 ── */}
      <section className="on-dark bg-dark text-on-dark">
        <div className="mx-auto max-w-6xl 2xl:max-w-7xl px-6 py-16">
          <p className="font-serif text-4xl font-black leading-snug md:text-6xl">
            在錢出去之前，
            <br />
            <span className="text-signal">看見它要去哪裡</span>
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/screening?auto=1" className="bg-signal px-6 py-3 font-bold text-dark hover:bg-on-dark">
              執行出金審查 Demo
            </Link>
            <Link to="/workbench" className="border border-on-dark-muted px-6 py-3 hover:border-on-dark">
              金流圖譜工作台
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
