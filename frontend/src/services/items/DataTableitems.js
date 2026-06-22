import { Edit03, Trash03 } from '../../components/template/TemplateIcons.jsx'

export const PAGE_SIZE_OPTIONS = [5, 10, 15]
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]
export const EMPTY_DATE_RANGE = {
  startDate: '',
  endDate: '',
}

const INDONESIAN_MONTHS = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
}

function createTimelineItem(status, title, detail, timestamp) {
  return {
    status,
    title,
    detail,
    timestamp,
  }
}

export const INITIAL_TICKET_ROWS = [
  {
    id: 'LGL-001',
    category: 'Contract',
    requestor: 'Nadia Putri',
    issue: 'Permintaan revisi klausul terminasi pada vendor agreement regional.',
    requestDate: '05 Mei 2026',
    status: 'Waiting',
    supportName: 'Alya Pratama',
    supportRole: 'Head of Legal',
    solution: 'Review redline dan finalisasi wording terminasi yang lebih aman.',
    timeline: [
      createTimelineItem(
        'Created',
        'Ticket dibuat',
        'Permintaan revisi klausul terminasi berhasil dikirim oleh Nadia Putri.',
        '2026-05-05T08:15:00+07:00',
      ),
      createTimelineItem(
        'Assigned',
        'PIC legal ditentukan',
        'Ticket diteruskan ke Alya Pratama untuk penanganan awal.',
        '2026-05-05T09:00:00+07:00',
      ),
      createTimelineItem(
        'Waiting',
        'Menunggu review legal',
        'Dokumen vendor agreement sedang antre untuk pemeriksaan awal.',
        '2026-05-05T11:20:00+07:00',
      ),
    ],
  },
  {
    id: 'LGL-002',
    category: 'Compliance',
    requestor: 'Rizky Ananta',
    issue: 'Permohonan validasi dokumen due diligence untuk onboarding partner baru.',
    requestDate: '04 Mei 2026',
    status: 'In Progress',
    supportName: 'Bima Saputra',
    supportRole: 'Senior Legal Counsel',
    solution: 'Checklist compliance sedang diverifikasi bersama tim procurement.',
    timeline: [
      createTimelineItem(
        'Created',
        'Ticket dibuat',
        'Dokumen due diligence dikirim untuk proses validasi awal.',
        '2026-05-04T08:40:00+07:00',
      ),
      createTimelineItem(
        'Assigned',
        'Ticket diterima legal',
        'Bima Saputra menerima ticket dan menyiapkan checklist verifikasi.',
        '2026-05-04T09:15:00+07:00',
      ),
      createTimelineItem(
        'In Progress',
        'Verifikasi berjalan',
        'Checklist compliance sedang dicocokkan dengan dokumen procurement.',
        '2026-05-04T13:30:00+07:00',
      ),
    ],
  },
  {
    id: 'LGL-003',
    category: 'Litigation',
    requestor: 'Maya Lestari',
    issue: 'Permintaan analisis risiko atas somasi dari mitra distribusi.',
    requestDate: '03 Mei 2026',
    status: 'Feedback',
    supportName: 'Dio Mahendra',
    supportRole: 'Litigation Specialist',
    solution: 'Menunggu kronologi tambahan dan dokumen pendukung dari business owner.',
    timeline: [
      createTimelineItem(
        'Created',
        'Ticket dibuat',
        'Permintaan analisis risiko atas somasi masuk ke antrean litigation.',
        '2026-05-03T10:05:00+07:00',
      ),
      createTimelineItem(
        'In Progress',
        'Analisis awal dimulai',
        'Tim legal memeriksa dokumen somasi dan menilai potensi eksposur sengketa.',
        '2026-05-03T11:10:00+07:00',
      ),
      createTimelineItem(
        'Feedback',
        'Butuh data tambahan',
        'Business owner diminta melengkapi kronologi dan dokumen pendukung.',
        '2026-05-03T15:45:00+07:00',
      ),
    ],
  },
  {
    id: 'LGL-004',
    category: 'Corporate',
    requestor: 'Kevin Hartono',
    issue: 'Perubahan struktur penandatanganan untuk addendum kerja sama operasional.',
    requestDate: '02 Mei 2026',
    status: 'Resolved',
    supportName: 'Clara Wijaya',
    supportRole: 'Corporate Legal Officer',
    solution: 'Addendum final sudah disetujui dan siap ditandatangani para pihak.',
    timeline: [
      createTimelineItem(
        'Created',
        'Ticket dibuat',
        'Permintaan perubahan struktur penandatanganan addendum berhasil dicatat.',
        '2026-05-02T08:25:00+07:00',
      ),
      createTimelineItem(
        'In Progress',
        'Draft addendum direview',
        'Tim corporate legal menyesuaikan klausul penandatanganan dan otorisasi pihak.',
        '2026-05-02T10:00:00+07:00',
      ),
      createTimelineItem(
        'Resolved',
        'Addendum selesai',
        'Dokumen final telah disetujui dan siap untuk proses penandatanganan.',
        '2026-05-02T16:20:00+07:00',
      ),
    ],
  },
  {
    id: 'LGL-005',
    category: 'Advisory',
    requestor: 'Tania Kusuma',
    issue: 'Permintaan opini legal untuk skema promosi bersama pihak ketiga.',
    requestDate: '01 Mei 2026',
    status: 'In Progress',
    supportName: 'Evelyn Santoso',
    supportRole: 'Compliance Analyst',
    solution: 'Draft legal opinion sedang dirapikan dengan fokus pada batas eksposur risiko.',
    timeline: [
      createTimelineItem(
        'Created',
        'Ticket dibuat',
        'Permintaan opini legal untuk skema promosi bersama pihak ketiga telah diterima.',
        '2026-05-01T09:10:00+07:00',
      ),
      createTimelineItem(
        'Assigned',
        'PIC advisory ditentukan',
        'Evelyn Santoso mulai menelaah struktur promosi dan ruang lingkup kerja sama.',
        '2026-05-01T09:40:00+07:00',
      ),
      createTimelineItem(
        'In Progress',
        'Legal opinion disusun',
        'Draft opini sedang dirapikan dengan fokus pada pembatasan eksposur risiko.',
        '2026-05-01T14:05:00+07:00',
      ),
    ],
  },
]

export function getStatusVariant(status) {
  if (status === 'Waiting') {
    return 'pending'
  }

  if (status === 'In Progress' || status === 'Resolved') {
    return 'active'
  }

  if (status === 'Feedback') {
    return 'app'
  }

  return 'inactive'
}

function matchesSearch(ticket, searchQuery) {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [
    ticket.id,
    ticket.category,
    ticket.requestor,
    ticket.issue,
    ticket.requestDate,
    ticket.status,
    ticket.supportName,
    ticket.supportRole,
    ticket.solution,
  ].some((value) => String(value).toLowerCase().includes(normalizedQuery))
}

function matchesStatus(ticket, statusFilter) {
  if (!statusFilter) {
    return true
  }

  return ticket.status === statusFilter
}

function parseInputDate(value) {
  const [year, month, day] = String(value).split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

function parseTicketRequestDate(value) {
  const [dayValue, monthLabel, yearValue] = String(value).trim().split(/\s+/)
  const day = Number(dayValue)
  const year = Number(yearValue)
  const month = INDONESIAN_MONTHS[monthLabel?.toLowerCase()]

  if (!day || !year || month === undefined) {
    return null
  }

  const date = new Date(year, month, day)

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }

  return date
}

function createFallbackTimelineTimestamp(value) {
  const [dayValue, monthLabel, yearValue] = String(value).trim().split(/\s+/)
  const day = Number(dayValue)
  const year = Number(yearValue)
  const month = INDONESIAN_MONTHS[monthLabel?.toLowerCase()]

  if (!day || !year || month === undefined) {
    return null
  }

  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(
    2,
    '0',
  )}T09:00:00+07:00`
}

function matchesDateRange(ticket, range) {
  if (!range.startDate || !range.endDate) {
    return true
  }

  const startDate = parseInputDate(range.startDate)
  const endDate = parseInputDate(range.endDate)

  if (!startDate || !endDate) {
    return true
  }

  const ticketDate = parseTicketRequestDate(ticket.requestDate)

  if (!ticketDate) {
    return false
  }

  const ticketTime = ticketDate.getTime()

  return ticketTime >= startDate.getTime() && ticketTime <= endDate.getTime()
}

export function getFilteredTicketRows(
  ticketRows,
  { searchQuery = '', dateRange = EMPTY_DATE_RANGE, statusFilter = '' } = {},
) {
  return ticketRows.filter(
    (ticket) =>
      matchesSearch(ticket, searchQuery) &&
      matchesDateRange(ticket, dateRange) &&
      matchesStatus(ticket, statusFilter),
  )
}

export function hasActiveTicketFilters({
  searchQuery = '',
  dateRange = EMPTY_DATE_RANGE,
  statusFilter = '',
} = {}) {
  const hasActiveDateFilter = Boolean(dateRange.startDate && dateRange.endDate)
  const hasActiveStatusFilter = Boolean(statusFilter)

  return Boolean(searchQuery || hasActiveDateFilter || hasActiveStatusFilter)
}

export function getTicketPageRows(filteredRows, currentPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const currentPageStart = (safeCurrentPage - 1) * pageSize
  const rows = filteredRows.slice(currentPageStart, currentPageStart + pageSize)
  const firstItem = filteredRows.length === 0 ? 0 : currentPageStart + 1
  const lastItem =
    filteredRows.length === 0 ? 0 : Math.min(currentPageStart + rows.length, filteredRows.length)

  return {
    totalPages,
    safeCurrentPage,
    rows,
    firstItem,
    lastItem,
  }
}

export function getTicketPaginationSummary(firstItem, lastItem, totalItems) {
  if (totalItems === 0) {
    return '0 dari 0 tiket'
  }

  return `${firstItem}-${lastItem} dari ${totalItems} tiket`
}

export function getTicketTimelineItems(ticket) {
  const timelineItems = Array.isArray(ticket?.timeline)
    ? ticket.timeline.filter(
        (item) => item && (item.status || item.title || item.detail || item.timestamp),
      )
    : []

  if (timelineItems.length > 0) {
    return timelineItems
  }

  return [
    {
      status: ticket?.status ?? 'Waiting',
      title: 'Status ticket saat ini',
      detail:
        ticket?.solution ||
        ticket?.issue ||
        'Belum ada riwayat status yang tersedia untuk ticket ini.',
      timestamp: createFallbackTimelineTimestamp(ticket?.requestDate),
    },
  ]
}

export function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'end-ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'start-ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', totalPages]
}

export function getTicketEmptyMessage(filters) {
  return hasActiveTicketFilters(filters)
    ? 'Tidak ada ticket yang sesuai dengan filter yang dipilih.'
    : 'Belum ada ticket untuk ditampilkan.'
}

export function getTicketTableActions({ onEdit, onDelete }) {
  return [
    {
      key: 'edit',
      label: 'Edit',
      icon: Edit03,
      onClick: onEdit,
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash03,
      variant: 'danger',
      onClick: onDelete,
    },
  ]
}
