import type { ReactNode } from 'react'

/** 卡片：surface 底、細線外框、頂端一條 2px 的強調線（預設為文字色，可換成訊號色／模型色） */
export function Panel({
  title,
  kicker,
  actions,
  accent = 'var(--color-line-strong)',
  className = '',
  children,
}: {
  title?: string
  kicker?: string
  actions?: ReactNode
  /** 頂端強調線顏色（CSS 色值） */
  accent?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`border border-line bg-surface p-5 md:p-6 ${className}`}
      style={{ borderTopWidth: 2, borderTopColor: accent }}
    >
      {(title || kicker || actions) && (
        <header className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            {kicker && <div className="kicker">{kicker}</div>}
            {title && <h2 className="text-lg font-bold text-text">{title}</h2>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}
