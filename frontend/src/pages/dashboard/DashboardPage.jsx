import { useEffect, useMemo, useState } from 'react'

import { Barcode, Boxes01, Calendar01, CheckSquare, LayoutDashboard } from '../../components/template/TemplateIcons.jsx'
import api from '../../services/api.js'
import CardDashboard from './CardDashboard.jsx'
import CanvasDashboard from './CanvasDashboard.jsx'

const MONTH_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
})

const MAX_PAGE_SIZE = 250

const PARENT_METRIC_OPTIONS = [
  { value: 'bundles', label: 'Bundle', cardLabel: 'Total Bundle' },
  { value: 'items', label: 'Item', cardLabel: 'Total Item' },
  { value: 'parents', label: 'Parent', cardLabel: 'Total Parent' },
]

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

function getDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthKey) {
  const [year, month] = String(monthKey ?? '').split('-').map(Number)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return MONTH_FORMATTER.format(new Date())
  }

  return MONTH_FORMATTER.format(new Date(year, month - 1, 1))
}

function isDateInMonth(value, monthKey) {
  const date = getDate(value)

  return Boolean(date && getMonthKey(date) === monthKey)
}

function isDateInCurrentMonth(value, now = new Date()) {
  return isDateInMonth(value, getMonthKey(now))
}

function getItemKind(item) {
  return String(item?.item_kind ?? item?.itemKind ?? item?.kind ?? '')
    .trim()
    .toLowerCase()
}

function isBundleItem(item) {
  return getItemKind(item) === 'bundle'
}

function isRegularItem(item) {
  return !isBundleItem(item)
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

function isActiveItem(item) {
  return !isInactiveItem(item)
}

async function loadAllPages(resource, params, signal) {
  const firstResponse = await resource.list({ ...params, page: 1, limit: MAX_PAGE_SIZE }, { signal })
  const firstRows = normalizeRows(firstResponse)
  const meta = normalizeMeta(firstResponse, firstRows)
  const pages = [firstRows]

  if (meta.totalPages > 1) {
    const requests = Array.from({ length: meta.totalPages - 1 }, (_, index) =>
      resource.list({ ...params, page: index + 2, limit: MAX_PAGE_SIZE }, { signal }),
    )
    const responses = await Promise.all(requests)

    responses.forEach((response) => {
      pages.push(normalizeRows(response))
    })
  }

  return {
    rows: pages.flat(),
    total: meta.total,
  }
}

function DashboardCardSelect({ ariaLabel, options, value, onChange }) {
  return (
    <select
      className="dashboard-card__select"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function DashboardPage({ activePage }) {
  const currentMonthKey = useMemo(() => getMonthKey(new Date()), [])
  const [summary, setSummary] = useState({
    totalParents: 0,
    totalSku: 0,
    newItemsThisMonth: 0,
    inactiveItems: 0,
    activeItems: 0,
  })
  const [itemRows, setItemRows] = useState([])
  const [selectedNewItemMonth, setSelectedNewItemMonth] = useState(currentMonthKey)
  const [selectedParentMetric, setSelectedParentMetric] = useState('parents')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const monthOptions = useMemo(() => {
    const monthKeys = new Set([currentMonthKey, selectedNewItemMonth])

    itemRows.forEach((item) => {
      const date = getDate(item?.created_at ?? item?.createdAt)

      if (date) {
        monthKeys.add(getMonthKey(date))
      }
    })

    return Array.from(monthKeys)
      .sort((firstMonth, secondMonth) => secondMonth.localeCompare(firstMonth))
      .map((monthKey) => ({
        value: monthKey,
        label: getMonthLabel(monthKey),
      }))
  }, [currentMonthKey, itemRows, selectedNewItemMonth])
  const monthLabel = useMemo(() => getMonthLabel(selectedNewItemMonth), [selectedNewItemMonth])
  const selectedNewItems = useMemo(
    () => itemRows.filter((item) => isDateInMonth(item?.created_at ?? item?.createdAt, selectedNewItemMonth)).length,
    [itemRows, selectedNewItemMonth],
  )
  const parentMetricCounts = useMemo(
    () => ({
      bundles: itemRows.filter(isBundleItem).length,
      items: itemRows.filter(isRegularItem).length,
      parents: summary.totalParents,
    }),
    [itemRows, summary.totalParents],
  )
  const selectedParentMetricOption =
    PARENT_METRIC_OPTIONS.find((option) => option.value === selectedParentMetric) ??
    PARENT_METRIC_OPTIONS[PARENT_METRIC_OPTIONS.length - 1]
  const metricCards = useMemo(
    () => [
      {
        key: 'parents',
        icon: Boxes01,
        label: selectedParentMetricOption.cardLabel,
        value: parentMetricCounts[selectedParentMetric] ?? 0,
        control: (
          <DashboardCardSelect
            ariaLabel="Pilih data parent"
            options={PARENT_METRIC_OPTIONS}
            value={selectedParentMetric}
            onChange={setSelectedParentMetric}
          />
        ),
        tone: 'blue',
      },
      {
        key: 'sku',
        icon: Barcode,
        label: 'Total SKU',
        value: summary.totalSku,
        // detail: 'Semua SKU item terdaftar',
        tone: 'purple',
      },
      {
        key: 'newItems',
        icon: Calendar01,
        label: 'New Item',
        value: selectedNewItems,
        control: (
          <DashboardCardSelect
            ariaLabel="Pilih bulan new item"
            options={monthOptions}
            value={selectedNewItemMonth}
            onChange={setSelectedNewItemMonth}
          />
        ),
        tone: 'gold',
      },
      {
        key: 'inactiveItems',
        icon: LayoutDashboard,
        label: 'Inactive Item',
        value: summary.inactiveItems,
        // detail: 'Item dengan status tidak aktif',
        tone: 'coral',
      },
      {
        key: 'activeItems',
        icon: CheckSquare,
        label: 'Active Item',
        value: summary.activeItems,
        // detail: 'Item dengan status aktif',
        tone: 'green',
      },
    ],
    [
      monthOptions,
      parentMetricCounts,
      selectedNewItemMonth,
      selectedNewItems,
      selectedParentMetric,
      selectedParentMetricOption,
      summary,
    ],
  )

  useEffect(() => {
    let isCurrent = true
    const controller = new AbortController()

    const loadDashboard = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [parentsResponse, itemResult] = await Promise.all([
          api.itemParents.list({ page: 1, limit: 1 }, { signal: controller.signal }),
          loadAllPages(api.items, {}, controller.signal),
        ])
        const parentRows = normalizeRows(parentsResponse)
        const parentMeta = normalizeMeta(parentsResponse, parentRows)
        const now = new Date()

        if (!isCurrent) {
          return
        }

        const itemRows = itemResult.rows

        setItemRows(itemRows)
        setSummary({
          totalParents: parentMeta.total,
          totalSku: itemResult.total,
          newItemsThisMonth: itemRows.filter((item) =>
            isDateInCurrentMonth(item.created_at ?? item.createdAt, now),
          ).length,
          inactiveItems: itemRows.filter(isInactiveItem).length,
          activeItems: itemRows.filter(isActiveItem).length,
        })
      } catch (error) {
        if (!isCurrent || error?.name === 'AbortError') {
          return
        }

        setItemRows([])
        setErrorMessage(error?.message || 'Dashboard belum bisa dimuat')
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isCurrent = false
      controller.abort()
    }
  }, [])

  return (
    <section className="dashboard-home" aria-label={activePage.title}>
      {errorMessage ? (
        <div className="dashboard-home__alert" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="dashboard-home__grid">
        {metricCards.map((card) => (
          <CardDashboard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={card.value}
            detail={card.detail}
            tone={card.tone}
            isLoading={isLoading}
            control={card.control}
          />
        ))}
      </div>

      <CanvasDashboard
        summary={summary}
        itemRows={itemRows}
        monthLabel={monthLabel}
        selectedMonthKey={selectedNewItemMonth}
        isLoading={isLoading}
      />
    </section>
  )
}

export default DashboardPage
