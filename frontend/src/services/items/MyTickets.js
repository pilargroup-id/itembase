const myTicketActivities = [
  {
    title: 'Review kontrak vendor',
    description: 'Draft kontrak sedang masuk tahap pengecekan klausul komersial.',
  },
  {
    title: 'Permintaan legal opinion',
    description: 'Tim bisnis meminta analisis risiko untuk kerja sama baru.',
  },
  {
    title: 'Pembaharuan dokumen',
    description: 'Template dokumen internal sedang disesuaikan dengan kebijakan terbaru.',
  },
]

function formatLastUpdated(lastUpdated) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(lastUpdated)
}

export function getMyTicketsOverviewCards(activePage) {
  return [
    {
      title: 'Waiting',
      eyebrow: 'Status',
      value: '5',
      detail: 'Tiket menunggu review awal.',
      state: 'Pending',
    },
    {
      title: 'In Progress',
      eyebrow: 'Status',
      value: '12',
      detail: 'Tiket sedang diproses oleh tim legal.',
      state: 'Active',
    },
    {
      title: 'Resolve',
      eyebrow: 'Status',
      value: '8',
      detail: 'Tiket yang telah diselesaikan.',
      state: 'Stable',
    },
    {
      title: 'Feedback',
      eyebrow: 'Status',
      value: '3',
      detail: 'Tiket menunggu feedback dari pemohon.',
      state: 'Focus',
    },
    {
      title: 'Void',
      eyebrow: 'Status',
      value: '1',
      detail: 'Tiket yang dibatalkan atau tidak valid.',
      state: 'Inactive',
    },
  ]
}

export function getMyTicketActivities() {
  return myTicketActivities
}

export function getMyTicketsWorkspaceItems({ activePath, lastUpdated, searchQuery }) {
  return [
    `Search: ${searchQuery || 'Belum ada kata kunci'}`,
    `Path aktif: ${activePath}`,
    `Update terakhir: ${formatLastUpdated(lastUpdated)}`,
  ]
}
