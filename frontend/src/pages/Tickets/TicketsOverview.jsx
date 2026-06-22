import { useMemo, useState } from 'react'

import ButtonRangeDate from '../../components/button/ButtonRangeDate.jsx'
import { Ticket01 } from '../../components/template/TemplateIcons.jsx'
import CardStatusMT from './CardStatusTickets.jsx'
import DataTableTickets, { INITIAL_TICKET_ROWS } from './DataTableTickets.jsx'
import DialogCreateTicket from '../../components/dialog/DialogCreateTickets.jsx'

function MyTickets({ activePage, searchQuery }) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [ticketRows, setTicketRows] = useState(INITIAL_TICKET_ROWS)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })
  const statusCounts = useMemo(
    () =>
      ticketRows.reduce((counts, ticket) => {
        counts[ticket.status] = (counts[ticket.status] ?? 0) + 1
        return counts
      }, {}),
    [ticketRows],
  )

  return (
    <>
      <CardStatusMT
        activeStatus={statusFilter}
        onStatusChange={setStatusFilter}
        statusCounts={statusCounts}
      />

      <section
        className="dashboard-panel users-table-card mytickets-table-card"
        aria-label="Aktivitas legal"
      >
        <div className="users-table-card__header mytickets-table-card__header">
          <div className="mytickets-table-card__title-group">
            <h1 className="dashboard-panel__title mytickets-table-card__title">
              {activePage?.title ?? 'MyTickets'}
            </h1>
          </div>

          <div className="users-table-card__actions">
            <ButtonRangeDate label="Request Date" onChange={setDateRange} />

            <button
              type="button"
              className="users-table-card__action"
              onClick={() => setIsCreateDialogOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isCreateDialogOpen}
            >
              <Ticket01 size={18} aria-hidden="true" />
              <span>Create Tickets</span>
            </button>
          </div>
        </div>

        <DataTableMT
          dateRange={dateRange}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          ticketRows={ticketRows}
          setTicketRows={setTicketRows}
          tableLabel={`${activePage?.title ?? 'MyTickets'} table`}
        />
      </section>

      <DialogCreateTicket
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </>
  )
}

export default MyTickets
