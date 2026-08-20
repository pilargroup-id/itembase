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
  control,
}) {
  const accentColor = TONE_COLORS[tone] ?? '#6c757d'
  const className = [
    'dashboard-card',
    'mtickets-status-card',
    control ? 'dashboard-card--with-control' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={className}>
      <div className="card-accent-bar" style={{ backgroundColor: accentColor }} />

      <div className="dashboard-card__badge-row">
        <div className="status-badge">
          <Icon size={16} aria-hidden="true" style={{ color: accentColor }} />
          <span className="dashboard-card__label">{label}</span>
        </div>
        {control ? <div className="dashboard-card__control">{control}</div> : null}
      </div>

      <strong className="dashboard-card__value mtickets-status-card__value">
        {isLoading ? '...' : formatNumber(value)}
      </strong>

      {detail ? (
        <div className="dashboard-card__bottom">
          <div className="dashboard-card__footer-text">{detail}</div>
        </div>
      ) : null}
    </article>
  )
}

export default CardDashboard
