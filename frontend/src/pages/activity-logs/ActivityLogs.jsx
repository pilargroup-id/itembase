import { useState } from 'react'

import DataTableLogs from '../../components/table/dekstop/items/DataTableLogs.jsx'

function ActivityLog({ activePage, searchQuery }) {
  const [activityLogsRefreshKey, setactivityLogsRefreshKey] = useState(0)

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card"
      aria-label={activePage.title}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{activePage.eyebrow}</p>
          <h1 className="dashboard-panel__title">{activePage.title}</h1>
        </div>
      </div>

      <DataTableLogs
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={activityLogsRefreshKey}
      />
    </section>
  )
}

export default ActivityLog
