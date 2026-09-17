import { GnnExplainer } from '../components/GnnExplainer'
import { Panel } from '../components/Panel'
import { RESEARCH_EVAL, StepF1Chart } from '../components/StepF1Chart'

const METRICS = [
  { model: 'GCN', features: '原始 165 維', p: 0.48, r: 0.535, f1: 0.506, auc: 0.524 },
  { model: 'GraphSAGE', features: '原始 165 維', p: 0.581, r: 0.666, f1: 0.62, auc: 0.671 },
  { model: 'GraphSAGE', features: '原始 + SNA（消融）', p: 0.552, r: 0.66, f1: 0.601, auc: 0.648 },
  { model: 'GraphSAGE + RMP', features: '原始 165 維', p: 0.707, r: 0.621, f1: 0.661, auc: 0.692 },
  { model: 'Random Forest', features: '原始 165 維', p: 0.907, r: 0.725, f1: 0.806, auc: 0.795 },
]

const FINDINGS = [
  {
    title: 'Random Forest 仍是最強基線',
    body: 'F1 0.806、PR-AUC 0.795，重現 Weber et al. 2019 的 RF≈0.79–0.83。在這份資料集上，圖神經網路並未勝過樹模型。',
  },
  {
    title: '反向訊息傳遞讓 GraphSAGE 的 F1 提升 4.1 個百分點',
    body: '0.620 → 0.661。讓模型同時看「誰付錢給它」與「它付錢給誰」，兩個方向的訊號互補（做法出自 AAAI 2024 Multi-GNN）。',
  },
  {
    title: '把 SNA 指標當特徵餵給模型，F1 沒有提升',
    body: '0.601 vs 0.620（消融實驗）。圖神經網路已隱含學到局部結構。SNA 在本系統的角色是可解釋層：產生人讀得懂的調查敘事，而不是分類特徵。',
  },
]

const REPO_RESEARCH_URL = 'https://github.com/zuemen/ChainLens/blob/main/docs/RESEARCH.md'

const GLOSSARY = [
  { term: 'illicit 類別', zh: '資料集中被標註為非法的交易；以下指標都只算這一類，因為它才是要抓的對象' },
  { term: 'F1', zh: 'Precision（抓到的有多少是真的）與 Recall（真的有多少被抓到）的調和平均' },
  { term: 'PR-AUC', zh: '不同門檻下 Precision–Recall 曲線底下的面積；非法樣本稀少時比準確率更有意義' },
  { term: '官方時間切分', zh: '用較早的 34 期訓練、較晚的 15 期測試，避免模型偷看到未來的資料' },
  { term: '消融', zh: '拿掉或加上某個元件，觀察成績變化，藉此確認該元件有沒有用' },
]

export default function Research() {
  const best = Math.max(...METRICS.map((row) => row.f1))
  return (
    <div className="space-y-8">
      <header className="border-b border-line pb-8">
        <div className="kicker">模型研究</div>
        <h1 className="mt-2 text-4xl font-black leading-tight text-brand md:text-5xl">圖神經網路，能不能抓到洗錢？</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted">
          我們在國際公開的 Elliptic 比特幣交易資料集（203,769 筆交易、官方時間切分）上，
          實測圖神經網路（GNN）與傳統模型辨識非法交易的能力。以下先給結論，再說明方法與數據。
        </p>
      </header>

      <section aria-labelledby="summary-title" className="bg-brand p-8 text-white md:p-10">
        <h2 id="summary-title" className="font-serif text-2xl font-bold">給決策者的三句話</h2>
        <ol className="mt-6 grid gap-8 md:grid-cols-3">
          <li>
            <div className="font-serif text-5xl font-black text-gold-on-dark">1</div>
            <p className="mt-3 text-xl font-bold leading-snug">模型可以抓到大部分非法交易</p>
            <p className="mt-2 leading-relaxed text-on-dark-muted">
              最佳的 Random Forest 抓出 72.5% 的非法交易，被它判為非法的，90.7% 確實是非法（F1 0.806）。圖神經網路最佳 0.661。
            </p>
          </li>
          <li>
            <div className="font-serif text-5xl font-black text-gold-on-dark">2</div>
            <p className="mt-3 text-xl font-bold leading-snug">但犯罪手法一變，所有模型同時失效</p>
            <p className="mt-2 leading-relaxed text-on-dark-muted">
              測試期第 43 期起，三個模型的 F1 分數都跌到接近 0。靠歷史案例訓練的模型，追不上新手法。
            </p>
          </li>
          <li>
            <div className="font-serif text-5xl font-black text-gold-on-dark">3</div>
            <p className="mt-3 text-xl font-bold leading-snug">所以即時審查不押寶模型</p>
            <p className="mt-2 leading-relaxed text-on-dark-muted">
              出金審查採可解釋的洗錢圖樣規則＋資金路徑追溯，不需歷史標註即可運作；模型作為研究基準，待臺灣在地資料建立後再接入。
            </p>
          </li>
        </ol>
      </section>

      <Panel title="什麼是圖神經網路？">
        <GnnExplainer />
      </Panel>

      <Panel title="整體成績：F1 分數（非法交易類別，越長越好）">
        <ul className="space-y-3">
          {[...METRICS].sort((a, b) => b.f1 - a.f1).map((row) => (
            <li key={`${row.model}-${row.features}`} className="grid grid-cols-[minmax(0,14rem)_1fr_3.5rem] items-center gap-4">
              <span className={row.f1 === best ? 'font-bold text-brand' : ''}>
                {row.model}
                {row.features.includes('SNA') && <span className="text-muted">（＋SNA，消融）</span>}
              </span>
              <span className="h-6 bg-panel-raised" aria-hidden="true">
                <span
                  className="block h-full"
                  style={{
                    width: `${row.f1 * 100}%`,
                    backgroundColor: row.f1 === best ? 'var(--color-brand)' : 'var(--color-line-strong)',
                  }}
                />
              </span>
              <span className={`tabular text-right ${row.f1 === best ? 'font-bold text-brand' : ''}`}>{row.f1.toFixed(3)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="關鍵發現：手法改變時，模型同時失效">
        <p className="mb-5 max-w-3xl leading-relaxed text-muted">
          測試期共 {RESEARCH_EVAL.test_nodes.toLocaleString('en-US')} 筆有標註交易，其中非法 {RESEARCH_EVAL.test_illicit.toLocaleString('en-US')} 筆。
          第 35–42 期 Random Forest 穩定在 0.78–0.97；第 43 期起，Weber et al.（2019）指出暗網市場關閉、犯罪行為型態改變，三個模型的 F1 同時跌到接近 0。
          這正是「只靠歷史標註訓練」的限制，也是出金審查改以結構圖樣主動偵測的原因。
        </p>
        <StepF1Chart />
        <p className="mt-4 text-sm leading-relaxed text-muted">
          數值由 <span className="tabular">python -m chainlens.models.evaluate</span> 直接載入 checkpoints/ 重算（{RESEARCH_EVAL.generated}），與上表一致。
          第 45、46 期非法交易只有 5 筆與 2 筆，該兩期的 F1 波動不具統計意義。
        </p>
      </Panel>

      <section className="grid gap-5 md:grid-cols-3">
        {FINDINGS.map((finding) => (
          <Panel key={finding.title} title={finding.title}>
            <p className="leading-relaxed text-muted">{finding.body}</p>
          </Panel>
        ))}
      </section>

      <Panel title="完整指標">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-sm text-muted">
              <tr>
                {['模型', '特徵', 'Precision', 'Recall', 'F1', 'PR-AUC'].map((head) => (
                  <th key={head} className="py-2 pr-4 font-normal">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((row) => (
                <tr key={`${row.model}-${row.features}`} className="border-t border-line">
                  <td className="py-2.5 pr-4">{row.model}</td>
                  <td className="py-2.5 pr-4 text-muted">{row.features}</td>
                  <td className="tabular py-2.5 pr-4">{row.p.toFixed(3)}</td>
                  <td className="tabular py-2.5 pr-4">{row.r.toFixed(3)}</td>
                  <td className="tabular py-2.5 pr-4">{row.f1.toFixed(3)}</td>
                  <td className="tabular py-2.5 pr-4">{row.auc.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          五列為同一次（2026/7/3）完整資料集實測。RMP＝反向訊息傳遞（reverse message passing）。
          Random Forest、GraphSAGE＋RMP、GCN 三列已由現存檢查點重算驗證；GraphSAGE 原始版的檢查點已被消融實驗覆蓋，該列為訓練當時紀錄。
          訓練設定：CPU、200 epochs、hidden 64、lr 0.01、加權 CrossEntropy（逆類別頻率）、
          weight decay 5e-4、seed 42；SNA 特徵為 in/out degree、PageRank、k-core、
          近似 betweenness（64 源點）之 z-score。
        </p>
      </Panel>

      <Panel title="名詞說明（給非技術讀者）">
        <dl className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          {GLOSSARY.map((item) => (
            <div key={item.term}>
              <dt className="font-bold">{item.term}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{item.zh}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="研究基礎">
        <p className="leading-relaxed text-muted">
          設計選擇與改進方向根據對 14 個主流研究方向的調查：Elliptic／Elliptic2 基準、
          IBM Multi-GNN、時序 GNN、洗錢手法分類、異質性 GNN、GNN 可解釋性、LLM＋圖、
          TRON／USDT 實證、商用系統、聯邦與隱私 AML 等。完整定位、痛點對應表與發展路線見{' '}
          <a href={REPO_RESEARCH_URL} className="underline underline-offset-4 hover:text-ink">
            GitHub 上的 docs/RESEARCH.md
          </a>
          。
        </p>
      </Panel>
    </div>
  )
}
