import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'

import ButtonExportDashboard from '../../components/button/dashboard-buttons/ButtonExportDashboard.jsx'
import { Export01 } from '../../components/template/TemplateIcons.jsx'

const NUMBER_FORMATTER = new Intl.NumberFormat('id-ID')
const PERCENT_FORMATTER = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
})
const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  month: 'short',
})

const COLORS = {
  active: '#2a9d8f',
  inactive: '#e76f51',
  parent: '#457b9d',
  sku: '#6d5dfc',
  newItem: '#e9c46a',
  category: '#f4a261',
  channel: '#264653',
  muted: '#8d99ae',
}

const FOCUS_COPY = {
  parents: {
    title: 'Parent vs SKU',
    description: 'Perbandingan jumlah parent item dan SKU aktif di master item.',
  },
  sku: {
    title: 'Komposisi Master Item',
    description: 'Snapshot total SKU, parent item, dan status item saat ini.',
  },
  newItems: {
    title: 'Tren New Item',
    description: 'Pergerakan item baru berdasarkan tanggal pembuatan.',
  },
  inactiveItems: {
    title: 'Kontrol Inactive Item',
    description: 'Pantau jumlah item tidak aktif terhadap total SKU.',
  },
  activeItems: {
    title: 'Kesehatan Active Item',
    description: 'Rasio item aktif dibandingkan seluruh SKU terdaftar.',
  },
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(value ?? 0)
}

function formatPercent(value, total) {
  if (!total) {
    return '0%'
  }

  return `${PERCENT_FORMATTER.format((value / total) * 100)}%`
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthDate(monthKey) {
  const [year, month] = String(monthKey ?? '').split('-').map(Number)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return new Date()
  }

  return new Date(year, month - 1, 1)
}

function getLastMonths(count, anchorDate = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth() - (count - 1 - index),
      1,
    )

    return {
      key: getMonthKey(date),
      month: SHORT_MONTH_FORMATTER.format(date),
      year: date.getFullYear(),
    }
  })
}

function getDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function getDisplayValue(value) {
  const displayValue = String(value ?? '').trim()

  return displayValue || 'Tidak terisi'
}

function getBrandName(item) {
  return getDisplayValue(item?.parent?.brand?.name ?? item?.brand?.name ?? item?.brand_name)
}

function getCategoryName(item) {
  return getDisplayValue(
    item?.parent?.category?.detail_category ??
      item?.parent?.category?.sub_category ??
      item?.category?.detail_category ??
      item?.category?.sub_category ??
      item?.category_name,
  )
}

function getBusinessUnitName(item) {
  const channels = Array.isArray(item?.channels) && item.channels.length > 0
    ? item.channels
    : item?.parent?.brand?.channels

  const channelBusinessUnit = Array.isArray(channels)
    ? channels
        .map(
          (channel) =>
            channel?.business_unit?.name ??
            channel?.business_unit?.code ??
            channel?.business_unit_name ??
            channel?.business_unit_code,
        )
        .find(Boolean)
    : null

  return getDisplayValue(
    channelBusinessUnit ??
      item?.business_unit?.name ??
      item?.business_unit?.code ??
      item?.business_unit_name ??
      item?.business_unit_code,
  )
}

function getTopCounts(rows, getLabels, limit = 5) {
  const counts = new Map()

  rows.forEach((row) => {
    const labels = getLabels(row)
    const normalizedLabels = Array.isArray(labels) ? labels : [labels]

    normalizedLabels.forEach((label) => {
      const key = getDisplayValue(label)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
  })

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((leftItem, rightItem) => rightItem.value - leftItem.value)
    .slice(0, limit)
}

function buildMonthlyDataset(rows, anchorMonthKey) {
  const months = getLastMonths(6, getMonthDate(anchorMonthKey))
  const totalsByMonth = new Map(months.map((month) => [month.key, 0]))

  rows.forEach((item) => {
    const date = getDate(item?.created_at ?? item?.createdAt)

    if (!date) {
      return
    }

    const monthKey = getMonthKey(date)

    if (totalsByMonth.has(monthKey)) {
      totalsByMonth.set(monthKey, totalsByMonth.get(monthKey) + 1)
    }
  })

  return months.map((month) => ({
    ...month,
    label: month.year === new Date().getFullYear() ? month.month : `${month.month} ${month.year}`,
    total: totalsByMonth.get(month.key) ?? 0,
  }))
}

function ChartCard({ title, meta, children, className = '' }) {
  return (
    <article className={['dashboard-chart-card', className].filter(Boolean).join(' ')}>
      <div className="dashboard-chart-card__header">
        <h3>{title}</h3>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div className="dashboard-chart-card__body">{children}</div>
    </article>
  )
}

function EmptyChart({ children = 'Belum ada data untuk ditampilkan.' }) {
  return <div className="dashboard-chart-empty">{children}</div>
}

function RankingList({ items }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  if (items.length === 0) {
    return <EmptyChart />
  }

  return (
    <div className="dashboard-ranking">
      {items.map((item, index) => (
        <div className="dashboard-ranking__item" key={`${item.name}-${index}`}>
          <div className="dashboard-ranking__label">
            <span>{item.name}</span>
            <strong>{formatNumber(item.value)}</strong>
          </div>
          <div className="dashboard-ranking__track" aria-hidden="true">
            <span style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CanvasDashboard({
  selectedKey = 'sku',
  summary,
  itemRows = [],
  monthLabel,
  selectedMonthKey,
  isLoading = false,
}) {
  const [disabledBusinessUnits, setDisabledBusinessUnits] = useState(() => new Set())

  const toggleBusinessUnit = (id) => {
    setDisabledBusinessUnits((previous) => {
      const next = new Set(previous)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  const chartData = useMemo(() => {
    const totalSku = summary?.totalSku ?? 0
    const activeItems = summary?.activeItems ?? 0
    const inactiveItems = summary?.inactiveItems ?? 0
    const activeRate = formatPercent(activeItems, totalSku)
    const inactiveRate = formatPercent(inactiveItems, totalSku)
    const monthlyDataset = buildMonthlyDataset(itemRows, selectedMonthKey)
    const topBrands = getTopCounts(itemRows, getBrandName)
    const topCategories = getTopCounts(itemRows, getCategoryName)
    const topBusinessUnits = getTopCounts(itemRows, getBusinessUnitName, 6)
    const businessUnitColors = [
      COLORS.parent,
      COLORS.sku,
      COLORS.category,
      COLORS.channel,
      COLORS.newItem,
      COLORS.muted,
    ]

    return {
      activeRate,
      inactiveRate,
      monthlyDataset,
      topBrands,
      topCategories,
      statusData: [
        { id: 'active', label: 'Active', value: activeItems, color: COLORS.active },
        { id: 'inactive', label: 'Inactive', value: inactiveItems, color: COLORS.inactive },
      ].filter((item) => item.value > 0),
      businessUnitData: topBusinessUnits.map((item, index) => ({
        id: item.name,
        label: item.name,
        value: item.value,
        color: businessUnitColors[index % businessUnitColors.length],
      })),
    }
  }, [itemRows, selectedMonthKey, summary])

const focus = FOCUS_COPY[selectedKey] ?? FOCUS_COPY.sku

  return (
    <section className="dashboard-canvas dashboard-canvas--charts" aria-label="Dashboard charts">
      <div className="dashboard-canvas__header">
        <div>
          <p className="dashboard-canvas__eyebrow">Overview</p>
          <h2>{focus.title}</h2>
          <p className="dashboard-canvas__description">{focus.description}</p>
        </div>
        <ButtonExportDashboard
          variant="action"
          className="dashboard-canvas__export"
          dialogEyebrow="Export Dashboard"
          dialogTitle="Export Dashboard"
          aria-label="Export dashboard"
        >
          <Export01 size={18} aria-hidden="true" />
          <span>Export</span>
        </ButtonExportDashboard>
      </div>

      <div className="dashboard-chart-scroll">
        <div className="dashboard-chart-grid">
          <ChartCard
            title="Status SKU"
            meta={`${chartData.activeRate} active`}
            className="dashboard-chart-card--status"
          >
            {isLoading ? (
              <EmptyChart>Memuat chart...</EmptyChart>
            ) : chartData.statusData.length > 0 ? (
              <div className="dashboard-status-chart">
                <Box sx={{ width: '100%', height: 250 }}>
                  <PieChart
                    series={[
                      {
                        data: chartData.statusData,
                        innerRadius: 58,
                        outerRadius: 98,
                        paddingAngle: 3,
                        cornerRadius: 6,
                        arcLabel: (item) => formatNumber(item.value),
                      },
                    ]}
                    hideLegend
                    margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  />
                </Box>
                <div className="dashboard-status-chart__legend">
                  <span>
                    <i style={{ backgroundColor: COLORS.active }} />
                    Active {chartData.activeRate}
                  </span>
                  <span>
                    <i style={{ backgroundColor: COLORS.inactive }} />
                    Inactive {chartData.inactiveRate}
                  </span>
                </div>
              </div>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <ChartCard title="New Item 6 Bulan" meta={monthLabel} className="dashboard-chart-card--wide">
            {isLoading ? (
              <EmptyChart>Memuat chart...</EmptyChart>
            ) : (
              <Box sx={{ width: '100%', height: 280 }}>
                <BarChart
                  dataset={chartData.monthlyDataset}
                  xAxis={[{ scaleType: 'band', dataKey: 'label' }]}
                  yAxis={[{ width: 42 }]}
                  series={[
                    {
                      dataKey: 'total',
                      label: 'New Item',
                      color: COLORS.newItem,
                      valueFormatter: (value) => `${formatNumber(value)} item`,
                    },
                  ]}
                  grid={{ horizontal: true }}
                  borderRadius={7}
                  hideLegend
                  margin={{ top: 18, right: 18, bottom: 34, left: 0 }}
                  slotProps={{
                    tooltip: {
                      trigger: 'axis',
                      anchor: 'pointer',
                      placement: 'top-end',
                    },
                  }}
                />
              </Box>
            )}
          </ChartCard>

          <ChartCard title="Business Unit" meta="berdasarkan SKU">
            {isLoading ? (
              <EmptyChart>Memuat chart...</EmptyChart>
            ) : chartData.businessUnitData.length > 0 ? (
              <div className="dashboard-pie-chart">
                <Box sx={{ width: '100%', height: 250 }}>
                  <PieChart
                    series={[
                      {
                        data: chartData.businessUnitData.filter(
                          (item) => !disabledBusinessUnits.has(item.id),
                        ),
                        innerRadius: 0,
                        outerRadius: 92,
                        paddingAngle: 2,
                        cornerRadius: 5,
                        arcLabel: (item) => formatNumber(item.value),
                      },
                    ]}
                    hideLegend
                    margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  />
                </Box>
                <div className="dashboard-chart-legend">
                  {chartData.businessUnitData.map((item) => {
                    const isDisabled = disabledBusinessUnits.has(item.id)

                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={[
                          'dashboard-chart-legend__item',
                          isDisabled ? 'dashboard-chart-legend__item--disabled' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-pressed={!isDisabled}
                        onClick={() => toggleBusinessUnit(item.id)}
                      >
                        <i style={{ backgroundColor: item.color }} />
                        {item.label} {formatNumber(item.value)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <ChartCard title="Top Brand" meta="berdasarkan SKU">
            <RankingList items={isLoading ? [] : chartData.topBrands} />
          </ChartCard>

          <ChartCard title="Top Category" meta="berdasarkan SKU">
            <RankingList items={isLoading ? [] : chartData.topCategories} />
          </ChartCard>
        </div>
      </div>
    </section>
  )
}

export default CanvasDashboard
