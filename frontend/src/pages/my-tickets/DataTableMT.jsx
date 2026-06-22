import { useEffect, useMemo, useState } from 'react'

import CreateButton from '../../components/button/CreateButton.jsx'
import DialogDelete from '../../components/dialog/DialogDelete.jsx'
import DialogEdit from '../../components/dialog/DialogEdit.jsx'
import DialogTimelineMT from '../../components/dialog/DialogTimelineMT.jsx'
import DataTable, {
  DataTableIdentity,
  DataTableStatus,
} from '../../components/table/DataTable.jsx'
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_DATE_RANGE,
  INITIAL_TICKET_ROWS,
  PAGE_SIZE_OPTIONS,
  getFilteredTicketRows,
  getPaginationItems,
  getStatusVariant,
  getTicketEmptyMessage,
  getTicketPageRows,
  getTicketPaginationSummary,
  getTicketTimelineItems,
  getTicketTableActions,
} from '../../services/my-tickets/DataTableMT.js'

const columns = [
  {
    key: 'category',
    header: 'Category',
    accessor: 'category',
    cellStyle: { whiteSpace: 'nowrap', width: '10%' },
  },
  {
    key: 'issue',
    header: 'Masalah',
    accessor: 'issue',
    cellStyle: { minWidth: '280px' },
  },
  {
    key: 'requestDate',
    header: 'Request Date',
    accessor: 'requestDate',
    cellStyle: { whiteSpace: 'nowrap', width: '11%' },
  },
  {
    key: 'status',
    header: 'Status',
    cellStyle: { whiteSpace: 'nowrap', width: '10%' },
    render: (ticket) => (
      <DataTableStatus inline variant={getStatusVariant(ticket.status)}>
        {ticket.status}
      </DataTableStatus>
    ),
  },
  {
    key: 'support',
    header: 'Support',
    cellStyle: { minWidth: '200px' },
    render: (ticket) => (
      <DataTableIdentity title={ticket.supportName} subtitle={ticket.supportRole} />
    ),
  },
  {
    key: 'solution',
    header: 'Solution',
    accessor: 'solution',
    cellStyle: { minWidth: '260px' },
  },
]

function DataTableMT({
  searchQuery = '',
  tableLabel = 'MyTickets table',
  dateRange = EMPTY_DATE_RANGE,
  statusFilter = '',
  ticketRows = INITIAL_TICKET_ROWS,
  setTicketRows,
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [activeActionDialog, setActiveActionDialog] = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)

  const filteredRows = useMemo(
    () => getFilteredTicketRows(ticketRows, { searchQuery, dateRange, statusFilter }),
    [dateRange, searchQuery, statusFilter, ticketRows],
  )
  const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
    () => getTicketPageRows(filteredRows, currentPage, pageSize),
    [currentPage, filteredRows, pageSize],
  )
  const selectedTicketName = selectedTicket?.id ?? 'ticket ini'
  const dialogTicket = selectedTicket ? { name: selectedTicket.id } : null

  const openActionDialog = (dialogType, ticket) => {
    setSelectedTicket(ticket)
    setActiveActionDialog(dialogType)
  }

  const closeActionDialog = () => {
    setActiveActionDialog(null)
    setSelectedTicket(null)
  }

  const handleEditConfirm = () => {
    closeActionDialog()
  }

  const handleDeleteConfirm = () => {
    if (selectedTicket?.id && typeof setTicketRows === 'function') {
      setTicketRows((currentRows) =>
        currentRows.filter((ticket) => ticket.id !== selectedTicket.id),
      )
    }

    closeActionDialog()
  }

  const handleTimelineOpen = (ticket) => {
    setSelectedTicket(ticket)
    setActiveActionDialog('timeline')
  }

  const tableActions = getTicketTableActions({
    onEdit: (ticket) => openActionDialog('edit', ticket),
    onDelete: (ticket) => openActionDialog('delete', ticket),
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [dateRange.endDate, dateRange.startDate, pageSize, searchQuery, statusFilter])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  const pagination = {
    summary: getTicketPaginationSummary(firstItem, lastItem, filteredRows.length),
    currentPage: safeCurrentPage,
    totalPages,
    items: getPaginationItems(safeCurrentPage, totalPages),
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    pageSizeLabel: 'Tampilkan',
    pageSizeSuffix: 'baris',
    previousLabel: 'Sebelumnya',
    nextLabel: 'Berikutnya',
    ariaLabel: 'MyTickets pagination',
    pageSizeAriaLabel: 'Jumlah baris ticket per halaman',
    onPrevious: () => setCurrentPage((page) => Math.max(1, page - 1)),
    onNext: () => setCurrentPage((page) => Math.min(totalPages, page + 1)),
    onSelect: (page) => setCurrentPage(page),
    onPageSizeChange: (nextPageSize) => setPageSize(nextPageSize),
  }

  return (
    <div className="mtickets-table-shell">
      <DataTable
        className="mtickets-table"
        rows={rows}
        columns={columns}
        getRowId={(ticket) => ticket.id}
        tableLabel={tableLabel}
        detail={{
          columnLabel: 'Detail',
          buttonLabel: 'Detail',
          eyebrow: 'Ticket ID',
          title: (ticket) => ticket.id,
          render: (ticket) => (
            <div className="mtickets-table__detail-actions">
              <p className="mtickets-table__detail-copy">
                Lihat riwayat perubahan status ticket beserta hari dan jam penanganannya.
              </p>
              <CreateButton
                variant="accordion"
                type="button"
                onClick={() => handleTimelineOpen(ticket)}
              >
                Lihat Timeline
              </CreateButton>
            </div>
          ),
        }}
        actions={tableActions}
        emptyMessage={getTicketEmptyMessage({ searchQuery, dateRange, statusFilter })}
        pagination={pagination}
      />

      <DialogEdit
        isOpen={activeActionDialog === 'edit'}
        eyebrow="Edit Ticket"
        title={`Edit ${selectedTicketName}`}
        user={dialogTicket}
        onClose={closeActionDialog}
        onConfirm={handleEditConfirm}
      />

      <DialogDelete
        isOpen={activeActionDialog === 'delete'}
        eyebrow="Delete Ticket"
        title={`Delete ${selectedTicketName}`}
        user={dialogTicket}
        onClose={closeActionDialog}
        onConfirm={handleDeleteConfirm}
      />

      <DialogTimelineMT
        isOpen={activeActionDialog === 'timeline'}
        eyebrow="Timeline Ticket"
        title={`Timeline ${selectedTicketName}`}
        items={selectedTicket ? getTicketTimelineItems(selectedTicket) : []}
        onClose={closeActionDialog}
      />
    </div>
  )
}

export default DataTableMT
