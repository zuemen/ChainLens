import { useState } from 'react'
import raw from '../api/research-eval.json'

interface StepPoint {
  t: number
  f1: number
  illicit: number
}
interface ModelEval {
  key: string
  label: string
  f1: number
  per_step: StepPoint[]
}

export const RESEARCH_EVAL = raw as { generated: string; test_nodes: number; test_illicit: number; models: ModelEval[] }

/** 類別色依模型固定指派（不隨篩選或排序重新上色）：RF＝文字色、GraphSAGE＋RMP＝GNN 模型色、GCN＝加強審查色 */
const SERIES_COLOR: Record<string, string> = {
  rf: 'var(--color-text)',
  'sage-rmp': 'var(--color-model)',
  gcn: 'var(--color-review)',
}
/** 線型也不同：色覺辨識困難時仍分得開 */
const SERIES_DASH: Record<string, string | undefined> = { rf: undefined, 'sage-rmp': '8 5', gcn: '2 5' }

const SHIFT_STEP = 43
const W = 760
const H = 300
const M = { top: 20, right: 24, bottom: 34, left: 44 }
const BAR_H = 70

/**
 * 逐時間段 F1：Elliptic 測試期（第 35–49 期）每一期的 illicit F1。
 * 資料由 `python -m chainlens.models.evaluate` 載入 checkpoints/ 重算產生。
 */
export function StepF1Chart() {
  const models = RESEARCH_EVAL.models
  const steps = models[0].per_step.map((point) => point.t)
  const [hover, setHover] = useState<number | null>(null)

  const plotW = W - M.left - M.right
  const plotH = H - M.top - M.bottom
  const x = (t: number) => M.left + ((t - steps[0]) / (steps[steps.length - 1] - steps[0])) * plotW
  const y = (f1: number) => M.top + (1 - f1) * plotH
  const maxIllicit = Math.max(...models[0].per_step.map((point) => point.illicit))
  const hoverIndex = hover === null ? null : steps.indexOf(hover)

  const onMove = (event: React.PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - box.left) / box.width
    const t = Math.round(steps[0] + ratio * (steps[steps.length - 1] - steps[0]))
    setHover(Math.min(steps[steps.length - 1], Math.max(steps[0], t)))
  }

  return (
    <figure>
      <ul className="mb-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {models.map((model) => (
          <li key={model.key} className="flex items-center gap-2">
            <svg width="28" height="10" aria-hidden="true">
              <line x1="0" y1="5" x2="28" y2="5" stroke={SERIES_COLOR[model.key]} strokeWidth="3" strokeDasharray={SERIES_DASH[model.key]} />
            </svg>
            {model.label}
            <span className="tabular text-muted">整體 F1 {model.f1.toFixed(3)}</span>
          </li>
        ))}
      </ul>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H + BAR_H + 24}`} className="block h-auto w-full" role="img" aria-label="Elliptic 測試期逐時間段 F1 折線圖；第 43 期起三個模型的 F1 都降到接近 0">
          {/* 第 43 期起的區段 */}
          <rect x={x(SHIFT_STEP) - plotW / 28} y={M.top} width={x(steps[steps.length - 1]) - x(SHIFT_STEP) + plotW / 28} height={plotH} className="fill-surface-2" />
          <text x={x(SHIFT_STEP) - plotW / 28 + 8} y={M.top + 18} className="fill-text text-[13px] font-bold">第 43 期起：暗網市場關閉</text>
          <text x={x(SHIFT_STEP) - plotW / 28 + 8} y={M.top + 36} className="fill-muted text-[12px]">犯罪手法改變，三個模型同時失效</text>

          {/* 格線與軸 */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-line)" strokeWidth={tick === 0 ? 1.5 : 1} />
              <text x={M.left - 8} y={y(tick) + 4} textAnchor="end" className="tabular fill-muted text-[12px]">{tick.toFixed(2)}</text>
            </g>
          ))}
          {steps.map((t) => (
            <text key={t} x={x(t)} y={H - M.bottom + 18} textAnchor="middle" className="tabular fill-muted text-[12px]">{t}</text>
          ))}
          <text x={M.left} y={M.top - 6} className="fill-muted text-[12px]">F1（illicit）</text>

          {/* 折線 */}
          {models.map((model) => (
            <polyline
              key={model.key}
              points={model.per_step.map((point) => `${x(point.t)},${y(point.f1)}`).join(' ')}
              fill="none"
              stroke={SERIES_COLOR[model.key]}
              strokeWidth={2.5}
              strokeDasharray={SERIES_DASH[model.key]}
              strokeLinejoin="round"
            />
          ))}

          {/* 下方：每期非法交易筆數（另一張圖，共用 x 軸，不做雙 y 軸） */}
          <text x={M.left} y={H + 6} className="fill-muted text-[12px]">每期非法交易筆數（測試集）</text>
          {models[0].per_step.map((point) => {
            const h = (point.illicit / maxIllicit) * (BAR_H - 20)
            return (
              <g key={point.t}>
                <rect x={x(point.t) - 11} y={H + BAR_H - h} width={22} height={h} rx={2} className="fill-line-strong" />
                {(point.illicit < 10 || point.t === 42) && (
                  <text x={x(point.t)} y={H + BAR_H - h - 4} textAnchor="middle" className="tabular fill-muted text-[11px]">{point.illicit}</text>
                )}
              </g>
            )
          })}

          {/* 懸停十字線 */}
          {hoverIndex !== null && (
            <g pointerEvents="none">
              <line x1={x(steps[hoverIndex])} x2={x(steps[hoverIndex])} y1={M.top} y2={H + BAR_H} stroke="var(--color-text)" strokeWidth={1} strokeDasharray="3 3" />
              {models.map((model) => (
                <circle key={model.key} cx={x(steps[hoverIndex])} cy={y(model.per_step[hoverIndex].f1)} r={5} fill={SERIES_COLOR[model.key]} stroke="var(--color-surface)" strokeWidth={2} />
              ))}
            </g>
          )}
          <rect
            x={M.left}
            y={M.top}
            width={plotW}
            height={H + BAR_H - M.top}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-2 border border-line bg-surface-2 px-3 py-2 text-sm"
            style={{ left: `${(x(steps[hoverIndex]) / W) * 100}%`, transform: hoverIndex > steps.length / 2 ? 'translateX(-105%)' : 'translateX(5%)' }}
          >
            <div className="font-bold">第 {steps[hoverIndex]} 期</div>
            {models.map((model) => (
              <div key={model.key} className="flex justify-between gap-6">
                <span>{model.label}</span>
                <span className="tabular">{model.per_step[hoverIndex].f1.toFixed(2)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between gap-6 text-muted">
              <span>非法交易筆數</span>
              <span className="tabular">{models[0].per_step[hoverIndex].illicit}</span>
            </div>
          </div>
        )}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted">以表格檢視逐期數值</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="tabular w-full text-left">
            <thead className="text-muted">
              <tr>
                <th scope="col" className="py-1.5 pr-4 font-normal">期別</th>
                {models.map((model) => (
                  <th key={model.key} scope="col" className="py-1.5 pr-4 font-normal">{model.label}</th>
                ))}
                <th scope="col" className="py-1.5 pr-4 font-normal">非法筆數</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((t, index) => (
                <tr key={t} className="border-t border-line">
                  <td className="py-1.5 pr-4">{t}</td>
                  {models.map((model) => (
                    <td key={model.key} className="py-1.5 pr-4">{model.per_step[index].f1.toFixed(2)}</td>
                  ))}
                  <td className="py-1.5 pr-4">{models[0].per_step[index].illicit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
