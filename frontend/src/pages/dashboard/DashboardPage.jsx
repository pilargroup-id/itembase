import { useEffect, useMemo, useState } from 'react'

import { Barcode, Boxes01, Calendar01, LayoutDashboard } from '../../components/template/TemplateIcons.jsx'
import api from '../../services/api.js'

const MONTH_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
})

const NUMBER_FORMATTER = new Intl.NumberFormat('id-ID')
const MAX_PAGE_SIZE = 250

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

function formatNumber(value) {
  return NUMBER_FORMATTER.format(value ?? 0)
}

function DashboardMetricCard({ icon: Icon, label, value, detail, tone = 'blue', isLoading }) {
  return (
    <article className={`dashboard-metric dashboard-metric--${tone}`}>
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
    </article>
  )
}

function DashboardPage({ activePage }) {
  const [summary, setSummary] = useState({
    totalParents: 0,
    totalSku: 0,
    newItemsThisMonth: 0,
    inactiveItems: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const monthLabel = useMemo(() => MONTH_FORMATTER.format(new Date()), [])

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

        setSummary({
          totalParents: parentMeta.total,
          totalSku: itemResult.total,
          newItemsThisMonth: itemResult.rows.filter((item) =>
            isDateInCurrentMonth(item.created_at, now),
          ).length,
          inactiveItems: itemResult.rows.filter(isInactiveItem).length,
        })
      } catch (error) {
        if (!isCurrent || error?.name === 'AbortError') {
          return
        }

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
        <DashboardMetricCard
          icon={Boxes01}
          label="Total Parent"
          value={summary.totalParents}
          detail="Semua parent item terdaftar"
          tone="blue"
          isLoading={isLoading}
        />
        <DashboardMetricCard
          icon={Barcode}
          label="Total SKU"
          value={summary.totalSku}
          detail="Semua SKU item terdaftar"
          tone="teal"
          isLoading={isLoading}
        />
        <DashboardMetricCard
          icon={Calendar01}
          label="New Item"
          value={summary.newItemsThisMonth}
          detail={`Dibuat pada ${monthLabel}`}
          tone="gold"
          isLoading={isLoading}
        />
        <DashboardMetricCard
          icon={LayoutDashboard}
          label="Inactive Item"
          value={summary.inactiveItems}
          detail="Item dengan status tidak aktif"
          tone="coral"
          isLoading={isLoading}
        />
      </div>
    </section>
  )
}

export default DashboardPage
