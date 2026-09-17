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
      className="flex flex-wrap items-center gap-4 border-l-4 border p-4"
      style={{ borderColor: 'var(--color-risk-med)', color: 'var(--color-risk-med)' }}
    >
      <span className="flex-1">{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="border border-current px-3 py-1 text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
