import type { ReactNode } from 'react'

export function Panel({
  title,
  actions,
  children,
}: {
  title?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border border-line border-t-2 border-t-ink bg-panel p-6">
      {(title || actions) && (
        <header className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}
