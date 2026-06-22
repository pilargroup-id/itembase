import { useState } from 'react';

const CardStatusTicket = [
    {
        tittle: 'Waiting',
        value: '5',
    },
    {
        tittle: 'In Progress',
        value: '12',
    },
    {
        tittle: 'Resolved',
        value: '8',
    },
    {
        tittle: 'Feedback',
        value: '3',
    },
    {
        tittle: 'Void',
        value: '1',
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

function CardStatusTickets() {
    const [activeCard, setActiveCard] = useState(CardStatusTicket[0]?.tittle ?? '')

    return (
        <section className="dashboard-overview tickets-status-overview" aria-label="Ringkasan status Tickets">
            {CardStatusTicket.map((cardTickets) => {
                const isActive = activeCard === cardTickets.tittle
                
                return (
                    <article
                    className={'dashboard-card clickable tickets-status-card' + (isActive ? ' active' : '')}
                    key={cardTickets.tittle}
                    style={isActive ? { borderColor: getColorForStatus(cardTickets.tittle) } : undefined}
                    onClick={() => setActiveCard(cardTickets.tittle)}
                    >

                        <div className="card-accent-bar" style={{ backgroundColor : accentColor}}>
                            <div className= "dashboard-card-content">
                                <span
                                className="status-indicator"
                                style={{ backgroundColor: getColorForStatus(cardTickets.tittle) }}
                                >
                                </span>
                            </div>
                        </div>
                        <span className="dashboard-card__label">{cardTickets.title}</span>

                        <div className="dashboard-card__footer-text">
                            {isActive ? 'Active Filter' : 'Click to filter'}
                        </div>
                    </article>
                )
            })}
        </section>
    )
}