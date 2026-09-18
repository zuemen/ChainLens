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
  { num: '0.806', title: 'Random Forest 仍是最強基線', body: '重現 Weber et al. 2019。這份資料集上，圖神經網路沒有勝過樹模型。' },
  { num: '+4.1', title: '反向訊息傳遞讓 GraphSAGE 提升 4.1 個百分點', body: '0.620 → 0.661。同時看「誰付錢給它」與「它付錢給誰」（AAAI 2024 Multi-GNN）。' },
  { num: '43', title: '第 43 期起，手法一變，三個模型同時失效', body: '暗網市場關閉後，F1 全部跌到接近 0。靠歷史標註訓練的模型追不上新手法。' },
]

/** 結構模型（第二引擎）的 13 個特徵，全部只靠交易圖就算得出 */
const FEATURES = [
  '收款來源數', '付款對象數', '轉入總額', '轉出總額', '轉出占比', '資金停留時間', '有無轉入',
  '有無轉出', '活躍時間跨度', '一小時內最多來源數', '一小時內最多去向數', '轉出金額變異係數', '是否已標註實體',
]

const REPO_RESEARCH_URL = 'https://github.com/zuemen/ChainLens/blob/main/docs/RESEARCH.md'

const GLOSSARY = [
  { term: 'illicit 類別', zh: '資料集中被標註為非法的交易；以下指標都只算這一類' },
  { term: 'F1', zh: 'Precision（抓到的有多少是真的）與 Recall（真的有多少被抓到）的調和平均' },
  { term: 'PR-AUC', zh: '不同門檻下 Precision–Recall 曲線底下的面積；非法樣本稀少時比準確率更有意義' },
  { term: '官方時間切分', zh: '用較早的 34 期訓練、較晚的 15 期測試，避免模型偷看到未來' },
  { term: '消融', zh: '拿掉或加上某個元件，觀察成績變化，藉此確認該元件有沒有用' },
]

export default function Research() {
  const best = Math.max(...METRICS.map((row) => row.f1))
  return (
    <div className="space-y-6">
      <header className="border-b border-line pb-6">
        <div className="kicker">模型研究・Elliptic 203,769 節點</div>
        <h1 className="mt-2 text-3xl font-black leading-tight md:text-5xl">為什麼是兩個引擎，不是一個模型</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">
          我們在 Elliptic 公開比特幣交易資料集（官方時間切分）實測圖神經網路與傳統模型。
          結論寫在下面這張圖：模型抓得到大部分非法交易，但手法一變就同時失效。所以規則引擎負責可稽核的處置，結構模型只補抓變體、只升不降。
        </p>
      </header>

      {/* 主視覺：第 43 期 */}
      <Panel kicker="主視覺" title="Elliptic 測試期逐期 F1：第 43 期起三個模型同時失效" accent="var(--color-signal)">
        <StepF1Chart />
        <p className="mt-4 text-sm leading-relaxed text-muted">
          測試期 {RESEARCH_EVAL.test_nodes.toLocaleString('en-US')} 筆有標註交易、非法 {RESEARCH_EVAL.test_illicit.toLocaleString('en-US')} 筆。
          數值由 <span className="tabular">python -m chainlens.models.evaluate</span> 載入 checkpoints/ 重算（{RESEARCH_EVAL.generated}）。第 45、46 期非法交易只有 5 筆與 2 筆，波動不具統計意義。
        </p>
      </Panel>

      <section className="grid gap-4 md:grid-cols-3">
        {FINDINGS.map((finding) => (
          <div key={finding.title} className="border border-line bg-surface p-5">
            <div className="big-num text-4xl">{finding.num}</div>
            <div className="mt-3 font-bold leading-snug">{finding.title}</div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{finding.body}</p>
          </div>
        ))}
      </section>

      {/* 結構模型卡 */}
      <Panel kicker="引擎二" title="結構模型卡：GraphSAGE" accent="var(--color-model)">
        <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <dl className="grid grid-cols-2 gap-4">
            {[
              ['特徵', '13 個'],
              ['層數', '2 層'],
              ['隱藏維度', '16'],
              ['訊息傳遞', '反向（RMP）'],
              ['權重', '49 KB'],
              ['推論', 'numpy'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="big-num mt-1 text-2xl" style={{ color: 'var(--color-model)' }}>{value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <div className="text-xs text-muted">13 個結構特徵（只靠交易圖就算得出，不需要 Elliptic 的 165 維）</div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {FEATURES.map((feature) => (
                <li key={feature} className="border border-line bg-surface-2 px-2 py-0.5 text-xs">{feature}</li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="mt-6 grid gap-3 text-sm md:grid-cols-3">
          <li className="border-l-2 border-model pl-3">
            <div className="font-bold">合成資料訓練</div>
            <p className="mt-1 text-muted">隨機化合成劇本圖 240 張、8:2 切分。訓練時修過兩個假關聯：加入合法外部入金、豐富合法背景。</p>
          </li>
          <li className="border-l-2 border-model pl-3">
            <div className="font-bold">劇本圖八個情境全部正確</div>
            <p className="mt-1 text-muted">情境 1～8 的模型機率全部落在預期區間；情境七 0.98 把規則放行升為加強審查，情境八 0.10 不誤傷。</p>
          </li>
          <li className="border-l-2 border-signal pl-3">
            <div className="font-bold text-signal">尚未用真實標註資料驗證</div>
            <p className="mt-1 text-muted">合成資料上的成績只證明模型學會了生成器裡的手法，不可與 Elliptic 數字相比。因此模型只能升、不能降，人做最後決定。</p>
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted">
          參考：Egressy et al., AAAI 2024（reverse message passing）。實作 chainlens/models/structural.py。
        </p>
      </Panel>

      <Panel kicker="給非技術讀者" title="什麼是圖神經網路？">
        <GnnExplainer />
      </Panel>

      <Panel kicker="Elliptic" title="整體成績：F1（非法交易類別，越長越好）">
        <ul className="space-y-3">
          {[...METRICS].sort((a, b) => b.f1 - a.f1).map((row) => (
            <li key={`${row.model}-${row.features}`} className="grid grid-cols-[minmax(0,12rem)_1fr_3.5rem] items-center gap-4 text-sm">
              <span className={row.f1 === best ? 'font-bold' : 'text-muted'}>
                {row.model}
                {row.features.includes('SNA') && <span className="text-muted">（＋SNA）</span>}
              </span>
              <span className="h-5 bg-surface-2" aria-hidden="true">
                <span
                  className="block h-full"
                  style={{ width: `${row.f1 * 100}%`, backgroundColor: row.f1 === best ? 'var(--color-text)' : row.model.includes('SAGE') ? 'var(--color-model)' : 'var(--color-line-strong)' }}
                />
              </span>
              <span className={`tabular text-right ${row.f1 === best ? 'font-bold' : 'text-muted'}`}>{row.f1.toFixed(3)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                {['模型', '特徵', 'Precision', 'Recall', 'F1', 'PR-AUC'].map((head) => (
                  <th key={head} className="py-2 pr-4 font-normal">{head}</th>
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
        <p className="mt-4 text-xs leading-relaxed text-muted">
          五列為同一次（2026/7/3）完整資料集實測。RMP＝反向訊息傳遞。RF、GraphSAGE＋RMP、GCN 三列已由現存檢查點重算驗證；GraphSAGE 原始版為訓練當時紀錄。
          設定：CPU、200 epochs、hidden 64、lr 0.01、加權 CrossEntropy、weight decay 5e-4、seed 42。
        </p>
      </Panel>

      <details className="border border-line bg-surface p-5">
        <summary className="cursor-pointer font-bold">名詞說明與研究基礎</summary>
        <dl className="mt-4 grid gap-x-10 gap-y-3 md:grid-cols-2">
          {GLOSSARY.map((item) => (
            <div key={item.term}>
              <dt className="font-bold">{item.term}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-muted">{item.zh}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          設計選擇根據對 14 個主流研究方向的調查（Elliptic／Elliptic2、IBM Multi-GNN、時序 GNN、可解釋性、TRON／USDT 實證等）。完整見{' '}
          <a href={REPO_RESEARCH_URL} className="underline underline-offset-4 hover:text-text">docs/RESEARCH.md</a>。
        </p>
      </details>
    </div>
  )
}
