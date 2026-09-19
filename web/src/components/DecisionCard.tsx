import type { Decision, RiskLabel, ScreenResult } from '../api/types'
import { DECISION_COLOR, DECISION_ZH } from '../content/scenarios'
import { Panel } from './Panel'

const LEVEL_ZH: Record<RiskLabel, string> = { high: '高', medium: '中', low: '低' }

function Num({ label, value, color, size = 'text-4xl' }: { label: string; value: string; color?: string; size?: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`big-num mt-1 ${size}`} style={{ color }}>{value}</div>
    </div>
  )
}

/** 三級處置刻度：分數落在哪一段。純視覺輔助，數值與處置文字已在旁邊，對輔助科技隱藏 */
function RiskScale({ score, color }: { score: number; color: string }) {
  const left = `${Math.min(100, Math.max(0, score * 100))}%`
  return (
    <div className="relative mt-5 h-11" aria-hidden="true">
      <div className="absolute inset-x-0 top-3 flex h-1.5">
        <div className="w-[40%]" style={{ background: 'var(--color-pass)', opacity: 0.45 }} />
        <div className="w-[30%]" style={{ background: 'var(--color-review)', opacity: 0.45 }} />
        <div className="w-[30%]" style={{ background: 'var(--color-signal)', opacity: 0.45 }} />
      </div>
      <div className="absolute top-0 h-7 w-1 -translate-x-1/2" style={{ left, backgroundColor: color }} />
      <div className="tabular absolute top-7 -translate-x-1/2 text-[11px] text-muted" style={{ left: '20%' }}>放行</div>
      <div className="tabular absolute top-7 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted" style={{ left: '55%' }}>≥0.4 加強審查</div>
      <div className="tabular absolute top-7 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted" style={{ left: '85%' }}>≥0.7 暫緩</div>
    </div>
  )
}

/** 決策卡：三欄「規則引擎｜GNN 模型｜處置（誰決定）」，下方為敘事與（情境 8 專屬的）反事實橫幅 */
export function DecisionCard({ result }: { result: ScreenResult }) {
  const ruleColor = DECISION_COLOR[result.rule_decision]
  const finalColor = DECISION_COLOR[result.decision]
  const model = result.model
  const modelHigh = model !== null && model.score >= 0.7

  return (
    <Panel kicker="審查決策" title="兩個引擎，一個處置" accent={finalColor}>
      <div className="grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
        {/* 欄一：規則引擎 */}
        <div className="md:pr-6">
          <div className="kicker">引擎一　規則引擎</div>
          <div className="mt-3 grid grid-cols-3 items-end gap-3">
            <Num label="自身結構" value={result.self_score.toFixed(2)} size="text-3xl" />
            <Num label="上游關聯" value={result.association_score.toFixed(2)} size="text-3xl" />
            <Num label="綜合" value={result.risk_score.toFixed(2)} color={ruleColor} size="text-5xl" />
          </div>
          <RiskScale score={result.risk_score} color={ruleColor} />
          <div className="mt-2 text-sm">
            規則結論：
            <strong style={{ color: ruleColor }}>{DECISION_ZH[result.rule_decision]}</strong>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            綜合 = 1 −（1 − 自身）×（1 − 關聯）；關聯 = 0.6^（階數 − 1）。
          </p>
        </div>

        {/* 欄二：GNN 模型（第二引擎專用色） */}
        <div className="md:px-6" style={{ color: 'var(--color-text)' }}>
          <div className="kicker" style={{ color: 'var(--color-model)' }}>引擎二　圖神經網路模型（GNN）</div>
          {model ? (
            <>
              <div className="mt-3 flex items-end gap-3">
                <div className="big-num text-5xl" style={{ color: 'var(--color-model)' }}>{model.score.toFixed(2)}</div>
                <div className="pb-1 text-sm">
                  <div className="text-muted">洗錢基礎設施機率</div>
                  <div className="font-bold" style={{ color: 'var(--color-model)' }}>{LEVEL_ZH[model.level]}</div>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {model.facts_zh.map((fact) => (
                  <li key={fact} className="flex gap-2">
                    <span aria-hidden="true" style={{ color: 'var(--color-model)' }}>▸</span>
                    <span>{fact}</span>
                  </li>
                ))}
                <li className="flex gap-2 text-muted">
                  <span aria-hidden="true" style={{ color: 'var(--color-model)' }}>▸</span>
                  <span>參考上下游兩階地址的同類特徵</span>
                </li>
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">未載入GNN 模型。</p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted">
            模型 ≥0.70 時只能把「放行」升為「加強審查」；不能單獨暫緩、不能降級。
          </p>
        </div>

        {/* 欄三：處置與誰決定 */}
        <div className="md:pl-6">
          <div className="kicker">處置</div>
          <div className="mt-3 text-2xl font-black leading-tight" style={{ color: finalColor }}>
            {result.decision_zh}
          </div>
          <div className="mt-4 text-xs text-muted">誰決定</div>
          {result.model_escalated ? (
            <div className="escalate-flow mt-1 text-sm" data-testid="escalation">
              <span style={{ color: ruleColor }}>規則放行</span>
              <span aria-hidden="true" className="border-0 text-muted">→</span>
              <span style={{ color: 'var(--color-model)' }}>模型加註</span>
              <span aria-hidden="true" className="border-0 text-muted">→</span>
              <span style={{ color: finalColor }}>加強審查</span>
            </div>
          ) : (
            <div className="mt-1 text-sm">
              由規則引擎決定
              {model && (
                <span className="text-muted">
                  ；GNN 模型{modelHigh ? '同樣判高' : '未觸發升級'}
                  {modelHigh && result.decision !== 'pass' ? '，意見一致' : ''}
                </span>
              )}
            </div>
          )}
          <p className="mt-4 border-t border-line pt-3 text-sm leading-relaxed">
            <strong>人做最後決定。</strong>
            <span className="text-muted">系統只給處置建議與證據鏈；法遵人員審閱後才生效。</span>
          </p>
        </div>
      </div>

      <p className="mt-6 border-l-4 pl-4 text-sm leading-relaxed text-muted" style={{ borderColor: finalColor }}>
        {result.narrative_zh}
        {result.decision === 'pass' && result.associations.length === 0 && (
          <> 追溯 4 階內，沒有任何命中洗錢圖樣的節點有資金流向這個地址。</>
        )}
      </p>

      {result.counterfactual && <CounterfactualBanner counterfactual={result.counterfactual} />}
    </Panel>
  )
}

/** 反事實橫幅：拿掉實體標註再算一次，誤報有多嚴重一眼看到 */
function CounterfactualBanner({ counterfactual }: { counterfactual: NonNullable<ScreenResult['counterfactual']> }) {
  const color = DECISION_COLOR[counterfactual.decision as Decision]
  return (
    <div
      role="note"
      data-testid="counterfactual"
      className="mt-5 grid gap-3 border border-line bg-surface-2 p-4 md:grid-cols-[auto_1fr] md:items-center"
    >
      <div>
        <div className="kicker">反事實</div>
        <div className="text-lg font-black">{counterfactual.label_zh}</div>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 md:justify-end">
        <span className="text-sm text-muted">綜合</span>
        <span className="big-num text-4xl" style={{ color }}>{counterfactual.risk_score.toFixed(2)}</span>
        <span className="text-lg font-bold" style={{ color }}>{DECISION_ZH[counterfactual.decision as Decision]}</span>
        <span className="text-muted">，</span>
        <span className="big-num text-4xl" style={{ color }}>{counterfactual.affected_nodes}</span>
        <span className="text-lg font-bold" style={{ color }}>名用戶全部連坐</span>
      </div>
    </div>
  )
}
