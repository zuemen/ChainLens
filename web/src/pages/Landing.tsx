import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { checkHealth } from '../api/client'

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
  { value: '795', label: '真實鏈上實測節點', note: 'TronGrid 即時擷取 TRON 地址 USDT 2 階金流圖' },
  { value: '129', label: '自動化測試', note: 'pytest 95＋vitest 34，GitHub Actions CI' },
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

/** 主視覺：被害人 → 客服收款 → 集資主錢包 → 車手 → 出金地址，橘色是被追溯出來的風險路徑 */
function FlowGraphic() {
  const victims = [[80, 120], [60, 250], [90, 380], [70, 520], [100, 640], [60, 760], [120, 820]]
  const support = [[300, 260], [300, 420], [300, 580]]
  const mules = [[680, 180], [680, 330], [680, 640], [680, 760]]
  const tail = [[820, 120], [820, 250], [820, 330], [820, 700], [820, 800], [920, 300]]
  const edges = [
    'M80 120L300 260', 'M60 250L300 260', 'M90 380L300 260', 'M70 520L300 420', 'M100 640L300 420',
    'M60 760L300 580', 'M120 820L300 580', 'M300 260L500 400', 'M300 420L500 400', 'M300 580L500 400',
    'M500 400L680 180', 'M500 400L680 330', 'M500 400L680 640', 'M500 400L680 760', 'M680 180L820 120',
    'M680 180L820 250', 'M680 330L820 330', 'M680 640L820 700', 'M680 760L820 800', 'M820 250L920 300',
    'M820 700L920 620',
  ]
  return (
    <svg viewBox="20 40 940 830" className="h-full w-full" role="img" aria-label="資金流向示意：被害人的資金經集資主錢包與車手，流向出金地址；橘色為被追溯出的風險路徑">
      <g stroke="#3A3833" strokeWidth="2" fill="none">
        {edges.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path className="flow-path" d="M500 400L680 480L820 540L920 620" stroke="#E4571F" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <g fill="#6F695C">
        {victims.map(([x, y], i) => (
          <circle key={`v${i}`} className="flow-node" style={{ animationDelay: `${i * 60}ms`, transformOrigin: `${x}px ${y}px` }} cx={x} cy={y} r="9" />
        ))}
        {tail.map(([x, y], i) => (
          <circle key={`t${i}`} className="flow-node" style={{ animationDelay: `${900 + i * 60}ms`, transformOrigin: `${x}px ${y}px` }} cx={x} cy={y} r="8" />
        ))}
      </g>
      <g fill="#A8A294">
        {support.map(([x, y], i) => (
          <circle key={`s${i}`} className="flow-node" style={{ animationDelay: `${400 + i * 80}ms`, transformOrigin: `${x}px ${y}px` }} cx={x} cy={y} r="15" />
        ))}
        {mules.map(([x, y], i) => (
          <circle key={`m${i}`} className="flow-node" style={{ animationDelay: `${700 + i * 80}ms`, transformOrigin: `${x}px ${y}px` }} cx={x} cy={y} r="13" />
        ))}
      </g>
      <circle className="flow-node" style={{ animationDelay: '600ms', transformOrigin: '500px 400px' }} cx="500" cy="400" r="30" fill="#E4571F" />
      <circle className="flow-node" style={{ animationDelay: '1500ms', transformOrigin: '680px 480px' }} cx="680" cy="480" r="13" fill="#E4571F" />
      <circle className="flow-node" style={{ animationDelay: '2100ms', transformOrigin: '820px 540px' }} cx="820" cy="540" r="13" fill="#E4571F" />
      <circle className="flow-target" cx="920" cy="620" r="22" fill="#121110" stroke="#F3EFE6" strokeWidth="6" />
      <g fontFamily="JetBrains Mono, monospace" fontSize="22" fill="#A8A294">
        <text x="40" y="70">被害人</text>
        <text x="440" y="340" fill="#F3EFE6">集資主錢包</text>
        <text x="640" y="130">車手</text>
        <text x="800" y="680" fill="#F3EFE6">出金地址</text>
      </g>
    </svg>
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
      {/* ── 主視覺 ── */}
      <section className="on-dark relative overflow-hidden bg-dark text-on-dark">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-6 py-16 md:grid-cols-[1.05fr_1fr] md:py-24">
          <div className="reveal">
            <ServiceStatus />
            <h1 className="mt-6 text-7xl font-black leading-none tracking-wider md:text-[8.5rem]">鏈鏡</h1>
            <div className="tabular mt-3 text-2xl tracking-wider text-on-dark-muted md:text-3xl">ChainLens</div>
            <p className="mt-8 font-serif text-2xl font-bold leading-relaxed md:text-[1.75rem]">
              Travel Rule 查「收款人是誰」
              <br />
              <span className="text-signal">鏈鏡查「這筆錢流向哪裡」</span>
            </p>
            <p className="mt-6 max-w-lg leading-relaxed text-on-dark-muted">
              基於社會網路分析與圖神經網路的虛擬資產詐騙金流偵測平台。出金目標即使從未被通報，
              仍可沿資金路徑追溯它與詐騙集資節點的關聯，在錢出去之前攔下來。
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/screening" className="bg-signal px-6 py-3 font-bold text-dark hover:bg-on-dark">
                看 50 萬 USDT 攔阻 Demo
              </Link>
              <Link to="/workbench" className="border border-on-dark-muted px-6 py-3 hover:border-on-dark">
                自己試查一個地址
              </Link>
            </div>
          </div>
          <div className="hidden aspect-[940/830] md:block">
            <FlowGraphic />
          </div>
        </div>
      </section>

      {/* ── 招牌情境 ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionHead index="01" kicker="應用情境" title="50 萬 USDT，要提領到一個「乾淨」的地址" />
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
          這個地址從未被通報、不在任何黑名單上，自身也不命中任何洗錢圖樣。名單比對會直接放行。
        </p>

        <div className="mt-10 grid items-stretch gap-0 md:grid-cols-[1fr_auto_1fr_auto_1.25fr]">
          <div className="border-2 border-ink bg-panel p-7">
            <div className="text-sm text-muted">自身結構分數</div>
            <div className="mt-2 font-serif text-7xl font-black leading-none">0.33</div>
            <p className="mt-4 text-sm leading-relaxed text-muted">單看地址本身，攔不住。</p>
          </div>
          <div className="tabular flex items-center justify-center px-5 py-2 text-4xl font-bold" aria-hidden="true">⊕</div>
          <div className="border-2 border-ink bg-panel p-7">
            <div className="text-sm text-muted">關聯風險分數</div>
            <div className="mt-2 font-serif text-7xl font-black leading-none text-signal-ink">0.60</div>
            <p className="mt-4 text-sm leading-relaxed text-muted">上游 2 階內，是命中三種洗錢圖樣的集資主錢包。</p>
          </div>
          <div className="tabular flex items-center justify-center px-5 py-2 text-4xl font-bold" aria-hidden="true">=</div>
          <div className="on-dark border-2 border-ink bg-ink p-7 text-on-dark">
            <div className="text-sm text-on-dark-muted">綜合風險分數</div>
            <div className="mt-2 font-serif text-7xl font-black leading-none text-signal">0.73</div>
            <p className="mt-4 font-bold">暫緩出金，啟動人工審查</p>
          </div>
        </div>

        <div className="relative mt-16 h-28" aria-hidden="true">
          <div className="absolute inset-x-0 top-14 flex h-3">
            <div className="w-[40%] bg-[#B9CFBF]" />
            <div className="w-[30%] bg-[#E6C9A1]" />
            <div className="w-[30%] bg-[#E3A89C]" />
          </div>
          <div className="absolute top-0 -translate-x-1/2 text-center text-risk-low" style={{ left: '10%' }}>
            <div className="tabular text-xl font-bold">0.10</div>
            <div className="whitespace-nowrap text-xs text-muted">對照組・正常用戶</div>
            <div className="mx-auto mt-1 h-4 w-0.5 bg-current" />
          </div>
          <div className="absolute top-0 -translate-x-1/2 text-center text-risk-high" style={{ left: '73%' }}>
            <div className="tabular text-xl font-bold">0.73</div>
            <div className="whitespace-nowrap text-xs text-muted">本案</div>
            <div className="mx-auto mt-1 h-4 w-0.5 bg-current" />
          </div>
          <div className="tabular absolute top-[4.6rem] -translate-x-1/2 text-xs text-muted" style={{ left: '40%' }}>0.4</div>
          <div className="tabular absolute top-[4.6rem] -translate-x-1/2 text-xs text-muted" style={{ left: '70%' }}>0.7</div>
          <div className="absolute top-[5.8rem] -translate-x-1/2 text-xs text-muted" style={{ left: '20%' }}>放行</div>
          <div className="absolute top-[5.8rem] -translate-x-1/2 text-xs text-muted" style={{ left: '55%' }}>加強審查</div>
          <div className="absolute top-[5.8rem] -translate-x-1/2 text-xs text-muted" style={{ left: '85%' }}>暫緩出金</div>
        </div>
        <p className="sr-only">對照組正常用戶的綜合風險分數為 0.10，予以放行；本案為 0.73，超過 0.7 的暫緩出金門檻。</p>

        <div className="mt-10">
          <Link to="/screening" className="inline-block border-b-2 border-signal pb-1 font-bold hover:text-signal-ink">
            親手按一次出金審查 →
          </Link>
        </div>
      </section>

      {/* ── 運作方式 ── */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHead index="02" kicker="分析方法" title="由手法找地址，再沿資金路徑傳導風險" />
          <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-8">
            <div className="absolute left-3 right-3 top-3 hidden h-0.5 bg-signal md:block" aria-hidden="true" />
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative md:pt-12">
                <span className="absolute left-0 top-0 hidden h-6 w-6 rounded-full border-4 border-signal bg-panel md:block" aria-hidden="true" />
                <div className="kicker">STEP {index + 1}</div>
                <h3 className="mt-2 font-serif text-2xl font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 grid gap-10 md:grid-cols-2">
            <div className="border-t-2 border-ink pt-5">
              <h3 className="font-serif text-xl font-bold">被害人不連坐</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                集資扇入的資金來源方是被害人，不加風險分。劇本圖 12 位被害人、5 位正常用戶全數判為低風險。
              </p>
            </div>
            <div className="border-t-2 border-ink pt-5">
              <h3 className="font-serif text-xl font-bold">洗錢執行層不漂白</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                快速分散的下游車手、剝洋蔥鏈的中繼地址一併標為風險節點。劇本圖 6 個車手、12 個中繼全數判為高風險。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 差異 ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionHead index="03" kicker="定位" title="把防線，從名單推進到資金結構" />
        <div className="mt-10 overflow-x-auto">
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
        <p className="mt-8 max-w-3xl border-l-4 border-signal pl-5 leading-relaxed text-muted">
          <strong className="text-ink">互補，而非取代。</strong>
          Travel Rule 回答的是「收款人是誰」；資金流向的關聯，仍需要結構分析補上。
        </p>
      </section>

      {/* ── 驗證 ── */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHead index="04" kicker="驗證" title="公開資料集基準，任何人都能重現" />
          <dl className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric) => (
              <div key={metric.label} className="border-t border-line-strong pt-5">
                <dd className="font-serif text-5xl font-black leading-none">{metric.value}</dd>
                <dt className="mt-3 font-bold">{metric.label}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">{metric.note}</dd>
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
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionHead index="05" kicker="現況" title="已經跑得起來的，與接下來要做的" />
        <p className="mt-5 max-w-3xl leading-relaxed text-muted">
          出金審查 Demo 使用合成劇本資料；尚無商業客戶導入。原始碼、測試與實測數據全部公開。
        </p>
        <div className="mt-10 grid gap-12 md:grid-cols-2">
          <div>
            <h3 className="flex items-baseline justify-between border-b-2 border-risk-low pb-3 text-lg font-bold text-risk-low">
              已實作 <span className="tabular text-xs font-medium">main 分支可執行</span>
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
              發展藍圖 <span className="tabular text-xs font-medium">尚未實作</span>
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
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-serif text-4xl font-black leading-snug md:text-6xl">
            在錢出去之前，
            <br />
            <span className="text-signal">看見它要去哪裡</span>
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/screening" className="bg-signal px-6 py-3 font-bold text-dark hover:bg-on-dark">
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
