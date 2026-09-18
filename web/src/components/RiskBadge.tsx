import type { RiskLabel } from '../api/types'

const LABEL_ZH: Record<RiskLabel, string> = {
  high: '高風險',
  medium: '中風險',
  low: '低風險',
}

const LABEL_COLOR: Record<RiskLabel, string> = {
  high: 'var(--color-signal)',
  medium: 'var(--color-review)',
  low: 'var(--color-pass)',
}

export function riskColor(label: RiskLabel): string {
  return LABEL_COLOR[label]
}

export function RiskBadge({ score, label }: { score: number; label: RiskLabel }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className="big-num text-6xl" style={{ color: riskColor(label) }}>
        {score.toFixed(2)}
      </span>
      <span className="whitespace-nowrap text-sm font-bold" style={{ color: riskColor(label) }}>
        {LABEL_ZH[label]}
      </span>
    </span>
  )
}
