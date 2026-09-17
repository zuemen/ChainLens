import type { Decision, ScreenResult } from '../api/types'
import { Panel } from './Panel'
import { RiskBadge } from './RiskBadge'

const DECISION_COLOR: Record<Decision, string> = {
  block: 'var(--color-risk-high)',
  review: 'var(--color-risk-med)',
  pass: 'var(--color-risk-low)',
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-serif text-4xl font-black leading-none">{value}</div>
    </div>
  )
}

/** 分數落在三級處置的哪一段；純視覺輔助，數值與處置文字已在上方，對輔助科技隱藏 */
function RiskScale({ score, color }: { score: number; color: string }) {
  const left = `${Math.min(100, Math.max(0, score * 100))}%`
  return (
    <div className="relative mt-7 h-12" aria-hidden="true">
      <div className="absolute inset-x-0 top-3 flex h-2">
        <div className="w-[40%] bg-zone-pass" />
        <div className="w-[30%] bg-zone-review" />
        <div className="w-[30%] bg-zone-block" />
      </div>
      <div className="absolute top-0 h-8 w-1 -translate-x-1/2" style={{ left, backgroundColor: color }} />
      <div className="absolute top-7 -translate-x-1/2 text-xs text-muted" style={{ left: '20%' }}>放行</div>
      <div className="absolute top-7 -translate-x-1/2 text-xs text-muted" style={{ left: '55%' }}>加強審查 ≥0.4</div>
      <div className="absolute top-7 -translate-x-1/2 text-xs text-muted" style={{ left: '85%' }}>暫緩出金 ≥0.7</div>
    </div>
  )
}

export function DecisionCard({ result }: { result: ScreenResult }) {
  return (
    <Panel title="審查決策">
      <div className="grid grid-cols-2 items-end gap-6 md:grid-cols-4">
        <div>
          <div className="text-xs text-muted">綜合風險分數</div>
          <div className="mt-1">
            <RiskBadge
              score={result.risk_score}
              label={result.risk_score >= 0.7 ? 'high' : result.risk_score >= 0.4 ? 'medium' : 'low'}
            />
          </div>
        </div>
        <Metric label="自身結構分數" value={result.self_score.toFixed(2)} />
        <Metric label="關聯風險分數" value={result.association_score.toFixed(2)} />
        <div>
          <div className="text-xs text-muted">處置建議</div>
          <div
            className="mt-1 font-serif text-xl font-bold"
            style={{ color: DECISION_COLOR[result.decision] }}
          >
            {result.decision_zh}
          </div>
        </div>
      </div>

      <RiskScale score={result.risk_score} color={DECISION_COLOR[result.decision]} />
      <p className="mt-2 text-sm text-muted">
        綜合 = 1 −（1 − 自身）×（1 − 關聯）；關聯 = 0.6^（階數 − 1），取所有上游風險節點中最大者。
      </p>

      <p
        className="mt-6 border-l-4 pl-4 text-sm leading-relaxed text-ink"
        style={{ borderColor: DECISION_COLOR[result.decision] }}
      >
        {result.narrative_zh}
        {result.decision === 'pass' && result.associations.length === 0 && (
          <> 追溯 4 階內，沒有任何命中洗錢圖樣的節點有資金流向這個地址。</>
        )}
      </p>
    </Panel>
  )
}
