export function ErrorNotice({
  message,
  action,
}: {
  message: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-4 border border-l-4 border-line bg-surface p-4 text-sm"
      style={{ borderLeftColor: 'var(--color-review)', color: 'var(--color-review)' }}
    >
      <span className="flex-1">{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="border border-current px-3 py-1 text-sm font-bold"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
