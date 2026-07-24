const NUMBER_FORMATTER = new Intl.NumberFormat('id-ID')

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
  const className = [
    'dashboard-metric',
    `dashboard-metric--${tone}`,
    isInteractive ? 'dashboard-metric--clickable' : '',
    isActive ? 'dashboard-metric--active' : '',
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
      <div className="dashboard-metric__top">
        <span className="dashboard-metric__icon">
          <Icon size={22} />
        </span>
        <span className="dashboard-metric__label">{label}</span>
      </div>
      <span className="dashboard-metric__value">
        {isLoading ? '...' : formatNumber(value)}
      </span>
      <p className="dashboard-metric__detail">{detail}</p>
    </>
  )

  if (href) {
    return (
      <a
        className={className}
        href={href}
        onClick={handleClick}
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
        aria-label={`Buka ${label}`}
        aria-pressed={isActive}
      >
        {content}
      </button>
    )
  }

  return (
    <article className={className}>
      {content}
    </article>
  )
}

export default CardDashboard
