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
        <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}
