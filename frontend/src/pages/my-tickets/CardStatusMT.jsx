const STATUS_CARDS = [
  {
    title: 'Waiting',
  },
  {
    title: 'In Progress',
  },
  {
    title: 'Resolved',
  },
  {
    title: 'Feedback',
  },
  {
    title: 'Void',
  },
]

function getColorForStatus(status) {
  switch (status) {
    case 'Waiting':
      return '#ffa500'
    case 'In Progress':
      return '#007bff'
    case 'Resolved':
      return '#28a745'
    case 'Feedback':
      return '#ffc107'
    case 'Void':
      return '#dc3545'
    default:
      return '#6c757d'
  }
}

function CardStatusMT({ activeStatus = '', onStatusChange, statusCounts = {} }) {
  const handleCardClick = (status) => {
    onStatusChange?.(activeStatus === status ? '' : status)
  }

  return (
    <section className="dashboard-overview mtickets-status-overview" aria-label="Ringkasan status MyTickets">
      {STATUS_CARDS.map((card) => {
        const isActive = activeStatus === card.title
        const accentColor = getColorForStatus(card.title)
        const cardValue = statusCounts[card.title] ?? 0

        return (
          <article
            className={`dashboard-card clickable mtickets-status-card${isActive ? ' active' : ''}`}
            key={card.title}
            style={isActive ? { borderColor: accentColor } : undefined}
            onClick={() => handleCardClick(card.title)}
          >
            <div className="card-accent-bar" style={{ backgroundColor: accentColor }} />

            <div className="dashboard-card__badge-row">
              <div className="status-badge">
                <span
                  className="status-indicator"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="dashboard-card__label">{card.title}</span>
              </div>
            </div>

            <strong className="dashboard-card__value mtickets-status-card__value">{cardValue}</strong>

            <div className="dashboard-card__footer-text">
              {isActive ? 'Click again to reset' : 'Click to filter'}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default CardStatusMT
