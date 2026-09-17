import { Link } from 'react-router-dom'
import { CaseReplay } from '../components/CaseReplay'
import { CASES, KEY_FACTS, MILESTONES, PAIN_POINTS, STRENGTHS, VASP_DEFENSE, type Source } from '../content/briefing'

const STEPS = [
  {
    title: '圖樣掃描',
    body: '把集資扇入、快速分散、集散、剝洋蔥鏈 4 類洗錢手法寫成規則，主動掃出命中的地址。',
  },
  {
    title: '上游追溯',
    body: '自出金目標沿資金流反向追查，最多 4 層，找出與詐騙網路相連的上游地址與完整路徑。',
  },
  {
    title: '風險融合',
    body: '每遠一層，風險打六折；再與地址自身的結構分數合併。地址本身乾淨、但上游有問題，也能被攔下。',
  },
  {
    title: '處置與申報草稿',
    body: '0.7 以上暫緩出金、0.4 以上加強審查。同時產出含逐筆金額與時間的可疑交易申報草稿，供法遵人員審閱。',
  },
]

const COMPARE = [
  { label: '回答的問題', blacklist: '地址是否已被通報', travel: '收付款人是誰', us: '錢從哪裡來、與詐騙網路是否相連' },
  { label: '面對全新詐騙地址', blacklist: '無法攔阻', travel: '身分資訊不揭露資金來源', us: '沿資金路徑追溯上游關聯' },
  { label: '輸出', blacklist: '命中／未命中', travel: '交易雙方身分資訊', us: '三級處置建議＋證據鏈＋申報草稿' },
]

const METRICS = [
  { value: '0.806', label: '模型研究最佳 F1', note: 'Elliptic 國際公開資料集（203,769 筆交易）' },
  { value: '795', label: '真實鏈上實測節點', note: 'TRON 地址 USDT 兩層金流圖（本機實測）' },
  { value: '160', label: '自動化測試', note: '持續整合，每次修改自動執行' },
  { value: '100%', label: '原始碼公開', note: '判定邏輯可檢視、可重現' },
]

const DONE = [
  '4 類洗錢圖樣偵測',
  '出金審查引擎與申報草稿',
  '社會網路分析指標與社群偵測',
  '圖神經網路與 Random Forest 研究基準',
  '網站、API 與分析工作台',
]

const ROADMAP = [
  '判定證據持久化稽核留存',
  '臺灣在地標註資料集',
  '比特幣／以太坊即時擷取',
  '混幣服務偵測',
  '模型接入即時審查',
]

function SourceLink({ source, dark = false }: { source: Source; dark?: boolean }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className={`underline decoration-1 underline-offset-4 ${dark ? 'text-on-dark-muted hover:text-white' : 'text-muted hover:text-brand'}`}
    >
      {source.label}
    </a>
  )
}

function SectionHead({ index, kicker, title, lead, dark = false }: { index: string; kicker: string; title: string; lead?: string; dark?: boolean }) {
  return (
    <header className="grid gap-x-8 gap-y-3 md:grid-cols-[5rem_1fr]">
      <div className={`font-serif text-5xl font-black leading-none ${dark ? 'text-gold-on-dark' : 'text-gold'}`} aria-hidden="true">
        {index}
      </div>
      <div>
        <div className="kicker">{kicker}</div>
        <h2 className={`mt-2 text-3xl font-black leading-snug md:text-4xl ${dark ? 'text-white' : 'text-brand'}`}>{title}</h2>
        {lead && <p className={`mt-4 max-w-3xl text-lg leading-relaxed ${dark ? 'text-on-dark-muted' : 'text-muted'}`}>{lead}</p>}
      </div>
    </header>
  )
}

/** 詐騙資金的四段路徑，VASP 出金端標為把關點 */
function MoneyPath() {
  const stages = [
    { title: '被害人付款', body: '假投資、假客服等話術，引導匯款或購買 USDT' },
    { title: '集團收款錢包', body: '多名被害人的款項匯入同一批地址' },
    { title: '多層轉手', body: '拆給車手、層層轉移，製造追查斷點' },
    { title: 'VASP／幣商出金', body: '換成法幣或轉往境外，錢一出去就難追回', gate: true },
  ]
  return (
    <ol className="grid gap-0 md:grid-cols-4">
      {stages.map((stage, index) => (
        <li
          key={stage.title}
          className={`relative p-6 ${stage.gate ? 'bg-brand text-white' : 'border border-line bg-panel'} ${index > 0 ? 'md:border-l-0' : ''}`}
        >
          <div className={`text-sm font-bold ${stage.gate ? 'text-gold-on-dark' : 'text-gold'}`}>第 {index + 1} 段</div>
          <div className={`mt-1 font-serif text-xl font-bold ${stage.gate ? 'text-white' : 'text-brand'}`}>{stage.title}</div>
          <p className={`mt-2 leading-relaxed ${stage.gate ? 'text-on-dark-muted' : 'text-muted'}`}>{stage.body}</p>
          {stage.gate && (
            <div className="mt-4 border-t border-dark-line pt-3 text-sm font-bold text-gold-on-dark">鏈鏡在這一段把關</div>
          )}
          {index < stages.length - 1 && (
            <span className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-line-strong bg-base md:block" aria-hidden="true" />
          )}
        </li>
      ))}
    </ol>
  )
}

export default function Landing() {
  return (
    <div>
      {/* ── 主視覺 ── */}
      <section className="on-dark relative overflow-hidden bg-brand text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.15fr_1fr] md:py-20 2xl:max-w-7xl">
          <div className="reveal">
            <div className="kicker">虛擬資產出金審查・金流追溯</div>
            <h1 className="mt-4 text-4xl font-black leading-[1.25] md:text-[3.25rem]">
              詐騙贓款的出口，
              <br />
              是虛擬資產的出金端。
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-on-dark-muted">
              鏈鏡在虛擬資產服務業者（VASP）審核出金的當下，沿鏈上資金路徑追溯收款地址與詐騙集資網路的關聯；
              即使該地址從未被通報，也能提出可稽核的處置建議。
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a href="#replay" className="bg-white px-6 py-3 font-bold text-brand hover:bg-panel-raised">
                30 秒看懂運作方式
              </a>
              <Link to="/screening?auto=1" className="border border-on-dark-muted px-6 py-3 font-bold hover:border-white">
                操作即時審查
              </Link>
            </div>
          </div>

          <dl className="grid content-center gap-4">
            {KEY_FACTS.map((fact) => (
              <div key={fact.label} className="border-l-4 border-gold-on-dark bg-white/[0.06] px-6 py-5">
                <dt className="sr-only">{fact.label}</dt>
                <dd>
                  <span className="font-serif text-5xl font-black leading-none">{fact.value}</span>
                  <span className="ml-2 text-lg font-bold">{fact.unit}</span>
                  <p className="mt-2 leading-relaxed text-on-dark-muted">{fact.label}</p>
                  <p className="mt-2 text-xs">
                    來源：<SourceLink source={fact.source} dark />
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 壹 為什麼是 VASP ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 2xl:max-w-7xl">
        <SectionHead
          index="壹"
          kicker="監理背景"
          title="VASP 出金端，是攔住詐騙資金的最後一道關卡"
          lead="詐騙資金最終必須換成法幣或轉往境外才能變現。資金一旦離開 VASP，跨境追查與返還都極為困難——出金審查的當下，是成本最低、效果最大的攔阻時機。"
        />
        <div className="mt-12">
          <MoneyPath />
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h3 className="font-serif text-2xl font-bold text-brand">監理要求正在快速到位</h3>
            <p className="mt-3 leading-relaxed text-muted">
              VASP 從登記制走向許可制，旅行規則將上路。業者需要能證明自己「評估過提幣資金流向」的工具——
              這正是金融檢查點出的缺失。
            </p>
          </div>
          <ol className="relative border-l-2 border-line pl-8">
            {MILESTONES.map((milestone) => (
              <li key={milestone.when + milestone.what} className="relative pb-7 last:pb-0">
                <span
                  className={`absolute -left-[2.45rem] top-1.5 h-4 w-4 rounded-full border-2 ${milestone.upcoming ? 'border-gold bg-panel' : 'border-brand bg-brand'}`}
                  aria-hidden="true"
                />
                <div className="text-sm font-bold text-gold">{milestone.when}</div>
                <p className="mt-1 text-lg leading-relaxed">{milestone.what}</p>
                <p className="mt-1 text-xs">
                  <SourceLink source={milestone.source} />
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 貳 實際案例 ── */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-6xl px-6 py-20 2xl:max-w-7xl">
          <SectionHead
            index="貳"
            kicker="實際案例"
            title="近期判決與偵辦：USDT 已是詐騙洗錢的主要通道"
            lead="以下依公開報導整理。每一件都出現「集中收款 → 多層轉手 → 出金或匯往境外」的結構，正是鏈鏡偵測的洗錢圖樣。"
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {CASES.map((item) => (
              <article key={item.id} className="flex flex-col border border-line border-t-4 border-t-brand bg-base p-6">
                <div className="text-sm text-muted">{item.authority}</div>
                <h3 className="mt-2 font-serif text-xl font-bold leading-snug text-brand">{item.title}</h3>
                <p className="mt-3 font-bold text-risk-high">{item.scale}</p>

                <div className="mt-5 text-sm font-bold text-gold">資金流向（依報導）</div>
                <ol className="mt-2 space-y-2">
                  {item.flow.map((step, index) => (
                    <li key={step} className="flex gap-3 leading-relaxed">
                      <span className="tabular mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-brand text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>

                <div className="mt-5 text-sm font-bold text-gold">對應鏈鏡的檢查點</div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {item.checkpoints.map((checkpoint) => (
                    <li key={checkpoint} className="border border-brand px-2.5 py-1 text-sm text-brand">
                      {checkpoint}
                    </li>
                  ))}
                </ul>

                <p className="mt-auto pt-6 text-xs">
                  來源：
                  {item.sources.map((source, index) => (
                    <span key={source.url}>
                      {index > 0 && '、'}
                      <SourceLink source={source} />
                    </span>
                  ))}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 bg-brand p-8 text-white md:grid-cols-[1.3fr_1fr]">
            <div>
              <h3 className="font-serif text-2xl font-bold">{VASP_DEFENSE.title}</h3>
              <p className="mt-3 leading-relaxed text-on-dark-muted">{VASP_DEFENSE.body}</p>
              <p className="mt-3 text-xs">
                來源：<SourceLink source={VASP_DEFENSE.source} dark />
              </p>
            </div>
            <div className="border-l-4 border-gold-on-dark pl-6">
              <div className="text-sm font-bold text-gold-on-dark">現行做法的缺口</div>
              <p className="mt-2 text-lg leading-relaxed">{VASP_DEFENSE.gap}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">
            註：檢查點為洗錢手法的對應說明，不代表鏈鏡曾參與偵辦或偵測上述案件。
          </p>
        </div>
      </section>

      {/* ── 參 痛點 → 解方 ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 2xl:max-w-7xl">
        <SectionHead
          index="參"
          kicker="問題與解方"
          title="六個痛點，鏈鏡逐一對應"
          lead="左欄是監理與業者實際遇到的問題（均附出處），右欄是鏈鏡的做法，以及在本站哪裡可以親眼看到。"
        />
        <ol className="mt-12 space-y-4">
          {PAIN_POINTS.map((item, index) => (
            <li key={item.pain} className="grid border border-line bg-panel md:grid-cols-[1fr_auto_1fr]">
              <div className="p-6">
                <div className="text-sm font-bold text-risk-high">痛點 {index + 1}</div>
                <h3 className="mt-1 font-serif text-xl font-bold text-ink">{item.pain}</h3>
                <p className="mt-2 leading-relaxed text-muted">{item.evidence}</p>
                <p className="mt-2 text-xs">
                  來源：<SourceLink source={item.source} />
                </p>
              </div>
              <div className="hidden items-center bg-brand px-3 text-2xl font-black text-gold-on-dark md:flex" aria-hidden="true">→</div>
              <div className="bg-brand p-6 text-white">
                <div className="text-sm font-bold text-gold-on-dark">鏈鏡的解方</div>
                <p className="mt-1 text-lg leading-relaxed">{item.solution}</p>
                <p className="mt-3 text-sm text-on-dark-muted">在哪裡看得到：{item.seeIt}</p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="mt-16 font-serif text-2xl font-bold text-brand">與現行兩種機制互補</h3>
        <p className="mt-2 max-w-3xl leading-relaxed text-muted">
          旅行規則讓業者知道「收付款人是誰」；但從未被通報的新地址，需要從資金結構判斷風險。三者互補，而非取代。
        </p>
        <div className="mt-6 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="font-serif text-lg">
                <th className="border-b-2 border-brand p-4" />
                <th className="border-b-2 border-brand p-4 font-bold text-brand">黑名單比對</th>
                <th className="border-b-2 border-brand p-4 font-bold text-brand">旅行規則（Travel Rule）</th>
                <th className="border-b-2 border-gold bg-brand p-4 font-bold text-white">鏈鏡 ChainLens</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="border-b border-line p-4 text-sm font-normal text-muted">{row.label}</th>
                  <td className="border-b border-line p-4 text-lg">{row.blacklist}</td>
                  <td className="border-b border-line p-4 text-lg">{row.travel}</td>
                  <td className="border-b border-dark-line bg-brand p-4 text-lg font-bold text-white">{row.us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 space-y-6 md:hidden">
          {COMPARE.map((row) => (
            <div key={row.label} className="border-t-2 border-brand pt-3">
              <div className="text-sm text-muted">{row.label}</div>
              <dl className="mt-2 space-y-2">
                <div className="bg-brand p-3 text-white"><dt className="text-xs text-on-dark-muted">鏈鏡 ChainLens</dt><dd className="font-bold">{row.us}</dd></div>
                <div><dt className="text-xs text-muted">黑名單比對</dt><dd>{row.blacklist}</dd></div>
                <div><dt className="text-xs text-muted">旅行規則</dt><dd>{row.travel}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* ── 肆 案件重演 ── */}
      <section id="replay" className="on-dark scroll-mt-16 bg-brand text-white">
        <div className="mx-auto max-w-6xl px-6 pb-2 pt-16 2xl:max-w-7xl">
          <SectionHead
            index="肆"
            kicker="運作示範・合成劇本"
            title="30 秒看懂：一筆名單比對會放行的出金"
            dark
          />
        </div>
        <CaseReplay />
      </section>

      {/* ── 伍 方法 ── */}
      <section className="border-b border-line bg-panel">
        <div className="mx-auto max-w-6xl px-6 py-20 2xl:max-w-7xl">
          <SectionHead
            index="伍"
            kicker="強項與方法"
            title="四個強項，每一項都能在 Demo 裡驗證"
          />
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {STRENGTHS.map((item) => (
              <li key={item.title} className="grid grid-cols-[auto_1fr] gap-5 bg-brand p-6 text-white">
                <span className="mt-1 h-10 w-1.5 bg-gold-on-dark" aria-hidden="true" />
                <div>
                  <h3 className="font-serif text-2xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-lg leading-relaxed text-on-dark-muted">{item.body}</p>
                  <p className="mt-3 border-t border-dark-line pt-3 text-sm text-gold-on-dark">實測：{item.proof}</p>
                </div>
              </li>
            ))}
          </ul>
          <h3 className="mt-16 font-serif text-2xl font-bold text-brand">怎麼做到：四個步驟，每一步都可以被檢查</h3>
          <ol className="mt-6 grid gap-6 md:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t-4 border-brand bg-base p-6">
                <div className="font-serif text-3xl font-black text-gold">{index + 1}</div>
                <h3 className="mt-2 font-serif text-xl font-bold text-brand">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="border border-line bg-base p-6">
              <h3 className="font-serif text-xl font-bold text-brand">被害人不連坐，洗錢執行層不漏放</h3>
              <p className="mt-2 leading-relaxed text-muted">
                資金來源方（被害人）不加風險分；分散下游的車手、層層轉手的中繼地址則一併標記。
                示範劇本中，12 位被害人、5 位正常用戶全數判為低風險，6 個車手、12 個中繼全數判為高風險。
              </p>
            </div>
            <div className="border border-line bg-base p-6">
              <h3 className="font-serif text-xl font-bold text-brand">關於圖神經網路</h3>
              <p className="mt-2 leading-relaxed text-muted">
                我們在國際公開資料集實測圖神經網路與傳統模型。結論是：犯罪手法一變，所有模型會同時失效；
                因此即時審查採可解釋的規則與路徑追溯，模型作為研究基準。
              </p>
              <Link to="/research" className="mt-3 inline-block font-bold text-brand underline underline-offset-4">
                看模型研究與圖解 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 陸 現況 ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 2xl:max-w-7xl">
        <SectionHead
          index="陸"
          kicker="驗證與現況"
          title="已經可以操作的，與接下來要做的"
          lead="示範情境使用合成劇本資料；尚無商業客戶導入。原始碼、測試與實測數據全部公開。"
        />
        <dl className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((metric) => (
            <div key={metric.label} className="border-t-2 border-brand pt-4">
              <dd className="font-serif text-4xl font-black leading-none text-brand">{metric.value}</dd>
              <dt className="mt-3 font-bold">{metric.label}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{metric.note}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-14 grid gap-12 md:grid-cols-2">
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
            <h3 className="flex items-baseline justify-between border-b-2 border-gold pb-3 text-lg font-bold text-gold">
              發展藍圖 <span className="text-sm font-medium">尚未實作</span>
            </h3>
            <ul>
              {ROADMAP.map((item) => (
                <li key={item} className="flex gap-3 border-b border-line py-3.5 text-muted">
                  <span className="text-gold" aria-hidden="true">○</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 行動呼籲 ── */}
      <section className="on-dark bg-brand text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-[1fr_auto] md:items-center 2xl:max-w-7xl">
          <p className="font-serif text-3xl font-black leading-snug md:text-4xl">
            在錢出去之前，看見它要去哪裡。
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/screening?auto=1" className="bg-white px-6 py-3 font-bold text-brand hover:bg-panel-raised">
              操作即時審查
            </Link>
            <Link to="/workbench" className="border border-on-dark-muted px-6 py-3 font-bold hover:border-white">
              金流圖譜工作台
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
