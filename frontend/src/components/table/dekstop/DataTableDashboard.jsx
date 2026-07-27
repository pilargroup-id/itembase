import { useEffect, useMemo, useState } from 'react'

import api from '../../../services/api.js'
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  getPaginationItems,
} from '../../../services/items/DataTableitems.js'
import DataTable, {
  DataTableIdentity,
  DataTableStatus,
} from './DataTable.jsx'

const API_PAGE_SIZE = 250

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const TABLE_CONFIG = {
  parents: {
    title: 'Total Parent',
    // description: 'Daftar semua parent item terdaftar.',
    resourceKey: 'itemParents',
    kind: 'parents',
  },
  sku: {
    title: 'Total SKU',
    // description: 'Daftar semua SKU item terdaftar.',
    resourceKey: 'items',
    kind: 'items',
  },
  newItems: {
    title: 'New Item',
    // description: 'Daftar item yang dibuat pada bulan berjalan.',
    resourceKey: 'items',
    kind: 'items',
    filter: (item) => isDateInCurrentMonth(item?.created_at ?? item?.createdAt),
  },
  inactiveItems: {
    title: 'Inactive Item',
    // description: 'Daftar item dengan status tidak aktif.',
    resourceKey: 'items',
    kind: 'items',
    filter: isInactiveItem,
  },
  activeItems: {
    title: 'Active Item',
    // description: 'Daftar item dengan status aktif.',
    resourceKey: 'items',
    kind: 'items',
    filter: (item) => !isInactiveItem(item),
  },
}

function formatDisplayValue(value) {
  const displayValue = String(value ?? '').trim()

  return displayValue || '-'
}

function renderValue(value) {
  const displayValue = formatDisplayValue(value)

  return (
    <span className="parent-table-value" title={displayValue}>
      {displayValue}
    </span>
  )
}

function normalizeRows(responseData) {
  if (Array.isArray(responseData)) {
    return responseData
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data
  }

  if (Array.isArray(responseData?.data?.data)) {
    return responseData.data.data
  }

  if (Array.isArray(responseData?.data?.rows)) {
    return responseData.data.rows
  }

  if (Array.isArray(responseData?.data?.results)) {
    return responseData.data.results
  }

  if (Array.isArray(responseData?.rows)) {
    return responseData.rows
  }

  if (Array.isArray(responseData?.results)) {
    return responseData.results
  }

  return []
}

function normalizeMeta(responseData, rows) {
  const meta = responseData?.meta ?? responseData?.data?.meta ?? {}
  const page = Number(meta.page ?? meta.current_page ?? 1)
  const limit = Number(meta.limit ?? meta.per_page ?? rows.length)
  const total = Number(meta.total ?? meta.total_data ?? rows.length)
  const totalPages = Number(
    meta.totalPages ?? meta.total_page ?? meta.totalPage ?? meta.total_pages ?? meta.last_page,
  )
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : rows.length || 1
  const safeTotal = Number.isInteger(total) && total >= 0 ? total : rows.length

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: safeLimit,
    total: safeTotal,
    totalPages: Number.isInteger(totalPages) && totalPages > 0
      ? totalPages
      : Math.max(1, Math.ceil(safeTotal / safeLimit)),
  }
}

function isDateInCurrentMonth(value, now = new Date()) {
  if (!value) {
    return false
  }

  const date = new Date(value)

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  )
}

function isInactiveItem(item) {
  const skuStatusText = [
    item?.sku_status?.code,
    item?.sku_status?.name,
    item?.sku_status_code,
    item?.sku_status_name,
    item?.sku_status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return item?.is_active === 0 || item?.is_active === false || skuStatusText.includes('inactive')
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return DATE_FORMATTER.format(date)
}

function formatItemChannels(item) {
  if (!Array.isArray(item?.channels) || item.channels.length === 0) {
    return '-'
  }

  return item.channels
    .map((channel) => formatDisplayValue(channel.channel_code ?? channel.channel_name))
    .filter((value) => value !== '-')
    .join(', ') || '-'
}

async function loadAllPages(resource, params, signal) {
  const firstResponse = await resource.list(
    { ...params, page: 1, limit: API_PAGE_SIZE },
    { signal },
  )
  const firstRows = normalizeRows(firstResponse)
  const meta = normalizeMeta(firstResponse, firstRows)
  const pages = [firstRows]

  if (meta.totalPages > 1) {
    const requests = Array.from({ length: meta.totalPages - 1 }, (_, index) =>
      resource.list({ ...params, page: index + 2, limit: API_PAGE_SIZE }, { signal }),
    )
    const responses = await Promise.all(requests)

    responses.forEach((response) => {
      pages.push(normalizeRows(response))
    })
  }

  return pages.flat()
}

function getPageRows(rows, currentPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const currentPageStart = (safeCurrentPage - 1) * pageSize
  const pageRows = rows.slice(currentPageStart, currentPageStart + pageSize)
  const firstItem = rows.length === 0 ? 0 : currentPageStart + 1
  const lastItem = rows.length === 0 ? 0 : Math.min(currentPageStart + pageRows.length, rows.length)

  return {
    firstItem,
    lastItem,
    pageRows,
    safeCurrentPage,
    totalPages,
  }
}

function getPaginationSummary(firstItem, lastItem, totalItems) {
  if (totalItems === 0) {
    return '0 dari 0 data'
  }

  return `${firstItem}-${lastItem} dari ${totalItems} data`
}

const parentColumns = [
  {
    key: 'identity',
    header: 'Parent Item',
    headerStyle: { width: '20%' },
    cellStyle: { width: '20%' },
    render: (parent) => (
      <DataTableIdentity
        title={parent.parent_name || parent.item_name || '-'}
        subtitle={parent.parent_code || '-'}
      />
    ),
  },
  {
    key: 'itemName',
    header: 'Item Name',
    headerStyle: { width: '18%' },
    cellStyle: { width: '18%' },
    render: (parent) => renderValue(parent.item_name),
  },
  {
    key: 'brand',
    header: 'Brand',
    headerStyle: { width: '12%' },
    cellStyle: { width: '12%' },
    render: (parent) => renderValue(parent.brand?.name),
  },
  {
    key: 'category',
    header: 'Category',
    headerStyle: { width: '20%' },
    cellStyle: { width: '20%' },
    render: (parent) => (
      <DataTableIdentity
        title={parent.category?.detail_category || parent.category?.sub_category || '-'}
        subtitle={parent.category?.main_category || '-'}
      />
    ),
  },
  {
    key: 'type',
    header: 'Item Source',
    headerStyle: { width: '14%' },
    cellStyle: { width: '14%' },
    render: (parent) => renderValue(parent.item_type?.name),
  },
  {
    key: 'port',
    header: 'Port',
    headerStyle: { width: '10%' },
    cellStyle: { width: '10%' },
    render: (parent) => renderValue(parent.port?.name),
  },
]

const itemColumns = [
  {
    key: 'identity',
    header: 'Item',
    headerStyle: { width: '20%' },
    cellStyle: { width: '20%' },
    render: (item) => (
      <DataTableIdentity
        title={item.item_name || '-'}
        subtitle={item.item_code || item.barcode || '-'}
      />
    ),
  },
  {
    key: 'barcode',
    header: 'Barcode',
    headerStyle: { width: '12%' },
    cellStyle: { width: '12%' },
    render: (item) => renderValue(item.barcode),
  },
  {
    key: 'parent',
    header: 'Parent',
    headerStyle: { width: '18%' },
    cellStyle: { width: '18%' },
    render: (item) => (
      <DataTableIdentity
        title={item.parent?.parent_name || '-'}
        subtitle={item.parent?.parent_code || '-'}
      />
    ),
  },
  {
    key: 'brand',
    header: 'Brand',
    headerStyle: { width: '10%' },
    cellStyle: { width: '10%' },
    render: (item) => renderValue(item.parent?.brand?.name),
  },
  {
    key: 'skuStatus',
    header: 'SKU Status',
    headerStyle: { width: '12%' },
    cellStyle: { width: '12%' },
    render: (item) => {
      const statusLabel = formatDisplayValue(
        item.sku_status?.name ?? item.sku_status_name ?? item.sku_status,
      )

      return (
        <DataTableStatus variant={isInactiveItem(item) ? 'inactive' : 'active'} inline>
          {statusLabel}
        </DataTableStatus>
      )
    },
  },
  {
    key: 'businessUnit',
    header: 'BU',
    headerStyle: { width: '8%' },
    cellStyle: { width: '8%' },
    render: (item) => renderValue(item.business_unit?.code ?? item.business_unit?.name),
  },
  {
    key: 'channels',
    header: 'Channel',
    headerStyle: { width: '10%' },
    cellStyle: { width: '10%' },
    render: (item) => renderValue(formatItemChannels(item)),
  },
  {
    key: 'createdAt',
    header: 'Created',
    headerStyle: { width: '10%' },
    cellStyle: { width: '10%' },
    render: (item) => renderValue(formatDate(item.created_at ?? item.createdAt)),
  },
]

function DataTableDashboard({ selectedKey }) {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)
  const config = TABLE_CONFIG[selectedKey]

  useEffect(() => {
    if (!config) {
      setRows([])
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadRows = async () => {
      setIsLoading(true)
      setErrorMessage('')
      setCurrentPage(1)

      try {
        const resource = api[config.resourceKey]
        const loadedRows = await loadAllPages(resource, { sort: 'date-desc' }, controller.signal)
        const filteredRows = typeof config.filter === 'function'
          ? loadedRows.filter(config.filter)
          : loadedRows

        if (!isMounted) {
          return
        }

        setRows(filteredRows)
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setRows([])
        setErrorMessage(error?.message || 'Gagal memuat data dashboard.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadRows()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [config])

  const {
    firstItem,
    lastItem,
    pageRows,
    safeCurrentPage,
    totalPages,
  } = useMemo(
    () => getPageRows(rows, currentPage, pageSize),
    [currentPage, pageSize, rows],
  )

  if (!config) {
    return null
  }

  const columns = config.kind === 'parents' ? parentColumns : itemColumns
  const emptyMessage = isLoading
    ? `Memuat data ${config.title.toLowerCase()}...`
    : errorMessage || `Belum ada data ${config.title.toLowerCase()} untuk ditampilkan.`
  const pagination = {
    summary: isLoading
      ? `Memuat data ${config.title.toLowerCase()}...`
      : getPaginationSummary(firstItem, lastItem, rows.length),
    currentPage: safeCurrentPage,
    totalPages,
    items: getPaginationItems(safeCurrentPage, totalPages),
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    pageSizeLabel: 'Tampilkan',
    pageSizeSuffix: 'baris',
    previousLabel: '<',
    nextLabel: '>',
    circularButtons: true,
    ariaLabel: `${config.title} pagination`,
    pageSizeAriaLabel: `Jumlah data ${config.title.toLowerCase()} per halaman`,
    onPrevious: () => setCurrentPage(Math.max(1, safeCurrentPage - 1)),
    onNext: () => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1)),
    onSelect: setCurrentPage,
    onPageSizeChange: (nextPageSize) => {
      setPageSize(nextPageSize)
      setCurrentPage(1)
    },
  }

  return (
    <div className="mtickets-table-shell parent-table-shell dashboard-canvas__table">
      <DataTable
        className="mtickets-table"
        rows={isLoading ? [] : pageRows}
        columns={columns}
        getRowId={(row, index) =>
          row.id ?? row.item_code ?? row.parent_code ?? row.barcode ?? index
        }
        tableLabel={`${config.title} table`}
        emptyMessage={emptyMessage}
        pagination={pagination}
      />
    </div>
  )
}

export default DataTableDashboard
