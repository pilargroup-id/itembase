import { useState } from 'react'

import ButtonCreatePort from '../../../components/button/ports-buttons/ButtonCreatePort.jsx'
import DataTablePorts from '../../../components/table/dekstop/master/DataTablePorts.jsx'

function PortsPages({ activePage, searchQuery }) {
  const [portRefreshKey, setPortRefreshKey] = useState(0)

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

        <div className="users-table-card__actions">
          <ButtonCreatePort
            onCreated={() => setPortRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTablePorts
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={portRefreshKey}
      />
    </section>
  )
}

export default PortsPages
