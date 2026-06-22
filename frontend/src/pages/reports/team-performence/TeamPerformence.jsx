import { useEffect, useMemo, useState } from 'react'

import ButtonRangeDate from '../../../components/button/ButtonRangeDate.jsx'
import GroupBarChartTP from '../../../components/chart/chart-team-performence/GroupBarChartMonthlyTP.jsx'
import GroupBarTimeSpendMT from '../../../components/chart/chart-team-performence/GroupBarTimeSpendMT.jsx'
import YearDropdownTP from '../../../components/dropdown/filter/YearTeamPerformance.jsx'
import ButtonExport from '../../../components/button/ButtonExport.jsx'
import { FileText01 } from '../../../components/template/TemplateIcons.jsx'

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May']

function createMonthlyPerformance(completedValues, pendingValues) {
  return monthLabels.map((month, index) => ({
    month,
    year: 2026,
    monthIndex: index + 1,
    completed: completedValues[index] ?? 0,
    pending: pendingValues[index] ?? 0,
  }))
}

const teamMembers = [
  {
    id: 'nabila-putri',
    name: 'Nabila Putri',
    role: 'Legal Officer',
    sla: '95%',
    monthlyPerformance: createMonthlyPerformance(
      [34, 36, 39, 44, 46],
      [8, 7, 6, 7, 5],
    ),
  },
  {
    id: 'mira-kartika',
    name: 'Mira Kartika',
    role: 'Contract Analyst',
    sla: '93%',
    monthlyPerformance: createMonthlyPerformance(
      [28, 30, 32, 35, 38],
      [10, 9, 8, 8, 7],
    ),
  },
  {
    id: 'bagas-pratama',
    name: 'Bagas Pratama',
    role: 'Finance Reviewer',
    sla: '91%',
    monthlyPerformance: createMonthlyPerformance(
      [22, 24, 27, 29, 31],
      [12, 11, 10, 9, 9],
    ),
  },
  {
    id: 'sarah-wijaya',
    name: 'Sarah Wijaya',
    role: 'Procurement Lead',
    sla: '94%',
    monthlyPerformance: createMonthlyPerformance(
      [26, 29, 31, 34, 36],
      [9, 9, 8, 7, 7],
    ),
  },
]

function parseDateValue(value) {
  const [year, month, day] = String(value).split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function getRangeKey(date) {
  return date.getFullYear() * 100 + date.getMonth() + 1
}

function filterMonthlyPerformance(monthlyPerformance, range) {
  const startDate = parseDateValue(range.startDate)
  const endDate = parseDateValue(range.endDate)

  if (!startDate || !endDate) {
    return monthlyPerformance
  }

  const startKey = getRangeKey(startDate)
  const endKey = getRangeKey(endDate)

  return monthlyPerformance.filter((item) => {
    const itemKey = item.year * 100 + item.monthIndex

    return itemKey >= startKey && itemKey <= endKey
  })
}

function getPerformanceTotals(monthlyPerformance) {
  return monthlyPerformance.reduce(
    (totals, item) => ({
      completed: totals.completed + item.completed,
      pending: totals.pending + item.pending,
    }),
    { completed: 0, pending: 0 },
  )
}

function getAvailableYears(members) {
  const years = new Set()

  members.forEach((member) => {
    member.monthlyPerformance.forEach((item) => {
      if (item.year) {
        years.add(item.year)
      }
    })
  })

  return Array.from(years).sort((leftYear, rightYear) => rightYear - leftYear)
}

function filterMembersByYear(members, selectedYear) {
  return members
    .map((member) => ({
      ...member,
      monthlyPerformance: member.monthlyPerformance.filter(
        (item) => String(item.year) === String(selectedYear),
      ),
    }))
    .filter((member) => member.monthlyPerformance.length > 0)
}

function formatRangeLabel(range) {
  const startDate = parseDateValue(range.startDate)
  const endDate = parseDateValue(range.endDate)

  if (!startDate || !endDate) {
    return 'Jan - May 2026'
  }

  const formatter = new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
  })

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`
}

export default function TeamPerformence() {
  const currentYear = String(new Date().getFullYear())
  const [selectedRange, setSelectedRange] = useState({
    startDate: '',
    endDate: '',
  })
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const filteredMembers = useMemo(
    () =>
      teamMembers.map((member) => ({
        ...member,
        monthlyPerformance: filterMonthlyPerformance(member.monthlyPerformance, selectedRange),
      })),
    [selectedRange],
  )
  const membersWithData = useMemo(
    () => filteredMembers.filter((member) => member.monthlyPerformance.length > 0),
    [filteredMembers],
  )
  const availableYears = useMemo(() => getAvailableYears(membersWithData), [membersWithData])
  const yearOptions = useMemo(
    () =>
      availableYears.map((year) => ({
        value: String(year),
        label: String(year),
      })),
    [availableYears],
  )
  const chartMembers = useMemo(
    () => filterMembersByYear(membersWithData, selectedYear),
    [membersWithData, selectedYear],
  )
  const totalCompleted = useMemo(
    () =>
      filteredMembers.reduce(
        (total, member) => total + getPerformanceTotals(member.monthlyPerformance).completed,
        0,
      ),
    [filteredMembers],
  )
  const totalPending = useMemo(
    () =>
      filteredMembers.reduce(
        (total, member) => total + getPerformanceTotals(member.monthlyPerformance).pending,
        0,
      ),
    [filteredMembers],
  )
  const topPerformer = useMemo(() => {
    const membersWithTotals = filteredMembers.map((member) => ({
      ...member,
      totals: getPerformanceTotals(member.monthlyPerformance),
    }))

    if (membersWithTotals.every((member) => member.monthlyPerformance.length === 0)) {
      return null
    }

    return membersWithTotals.sort((leftMember, rightMember) => {
      return rightMember.totals.completed - leftMember.totals.completed
    })[0]
  }, [filteredMembers])
  const lightestBacklog = useMemo(() => {
    const membersWithTotals = filteredMembers.map((member) => ({
      ...member,
      totals: getPerformanceTotals(member.monthlyPerformance),
    }))

    if (membersWithTotals.every((member) => member.monthlyPerformance.length === 0)) {
      return null
    }

    return membersWithTotals.sort((leftMember, rightMember) => {
      return leftMember.totals.pending - rightMember.totals.pending
    })[0]
  }, [filteredMembers])
  const activeRangeLabel = useMemo(() => formatRangeLabel(selectedRange), [selectedRange])

  useEffect(() => {
    if (yearOptions.length === 0) {
      return
    }

    const selectedYearExists = yearOptions.some((option) => option.value === selectedYear)

    if (!selectedYearExists) {
      const fallbackYear = yearOptions.find((option) => option.value === currentYear)?.value

      setSelectedYear(fallbackYear ?? yearOptions[0].value)
    }
  }, [currentYear, selectedYear, yearOptions])

  return (
    <section className="chart-page" aria-label="Team performance report">
      <article className="dashboard-panel users-table-card">
        <div className="users-table-card__header">
          <div>
            <p className="dashboard-panel__eyebrow">Reports</p>
            <h1 className="dashboard-panel__title">Team Performance</h1>
            <p className="users-table-card__description">
              Monitoring performa bulanan setiap user berdasarkan jumlah tiket completed dan
              pending pada periode {activeRangeLabel}.
            </p>
          </div>

          <div className="users-table-card__actions">
            <ButtonRangeDate label="Periode" onChange={setSelectedRange} />
            <ButtonExport variant="action" aria-label="Export team performance report">
              <FileText01 size={18} aria-hidden="true" />
              <span>Export</span>
            </ButtonExport>
          </div>
        </div>
      </article>

      <div className="chart-grid">
        <article className="dashboard-panel chart-card chart-card--wide">
          <div className="chart-card__header chart-card__header--split">
            <div className="chart-card__header-copy">
              <p className="dashboard-panel__eyebrow">Monthly Completed by User</p>
              <h2 className="dashboard-panel__title">Team Monthly Performance</h2>
            </div>

            {yearOptions.length > 0 ? (
              <YearDropdownTP
                label="Tahun"
                value={selectedYear}
                options={yearOptions}
                onChange={setSelectedYear}
                className="chart-card__header-action"
              />
            ) : null}
          </div>

          <div className="chart-card__body">
            {membersWithData.length > 0 ? (
              <GroupBarChartTP
                members={chartMembers}
                emptyMessage={`Belum ada data monthly performance untuk tahun ${selectedYear}.`}
              />
            ) : (
              <p className="users-table-card__description">
                Belum ada data monthly pada rentang tanggal ini.
              </p>
            )}
          </div>
        </article>

        <article className="dashboard-panel chart-card chart-card--wide">
          <div className="chart-card__header">
            <div className="chart-card__header-copy">
              <p className="dashboard-panel__eyebrow">Monthly Time Spend by User</p>
              <h2 className="dashboard-panel__title">Team Monthly Time Spend</h2>
            </div>
          </div>

          <div className="chart-card__body">
            {membersWithData.length > 0 ? (
              <GroupBarTimeSpendMT
                members={chartMembers}
                emptyMessage={`Belum ada data monthly time spend untuk tahun ${selectedYear}.`}
              />
            ) : (
              <p className="users-table-card__description">
                Belum ada data monthly pada rentang tanggal ini.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
