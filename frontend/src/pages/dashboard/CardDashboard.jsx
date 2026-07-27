const NUMBER_FORMATTER = new Intl.NumberFormat('id-ID')

const TONE_COLORS = {
  blue: '#007bff',
  teal: '#2a9d8f',
  gold: '#ffc107',
  coral: '#dc3545',
  green: '#28a745',
  purple: '#6610f2',
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(value ?? 0)
}

function CardDashboard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'blue',
  isLoading,
  href,
  onNavigate,
  onSelect,
  isActive = false,
}) {
  const isInteractive = Boolean(href || onSelect)
  const accentColor = TONE_COLORS[tone] ?? '#6c757d'
  const className = [
    'dashboard-card',
    isInteractive ? 'clickable' : '',
    'mtickets-status-card',
    isActive ? 'active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handleClick = (event) => {
    onSelect?.()

    if (
      !href ||
      !onNavigate ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return
    }

    event.preventDefault()
    onNavigate(href)
  }

  const content = (
    <>
      <div className="card-accent-bar" style={{ backgroundColor: accentColor }} />

      <div className="dashboard-card__badge-row">
        <div className="status-badge">
          <Icon size={16} aria-hidden="true" style={{ color: accentColor }} />
          <span className="dashboard-card__label">{label}</span>
        </div>
      </div>

      <strong className="dashboard-card__value mtickets-status-card__value">
        {isLoading ? '...' : formatNumber(value)}
      </strong>

      <div className="dashboard-card__footer-text">{detail}</div>
    </>
  )

  if (href) {
    return (
      <a
        className={className}
        href={href}
        onClick={handleClick}
        style={isActive ? { borderColor: accentColor } : undefined}
        aria-label={`Buka ${label}`}
      >
        {content}
      </a>
    )
  }

  if (isInteractive) {
    return (
      <button
        className={className}
        type="button"
        onClick={handleClick}
        style={isActive ? { borderColor: accentColor } : undefined}
        aria-label={`Buka ${label}`}
        aria-pressed={isActive}
      >
        {content}
      </button>
    )
  }

  return (
    <article
      className={className}
      style={isActive ? { borderColor: accentColor } : undefined}
    >
      {content}
    </article>
  )
}

export default CardDashboard
