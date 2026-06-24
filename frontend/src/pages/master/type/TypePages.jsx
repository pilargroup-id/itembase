import { useState } from 'react'

import ButtonCreateBrand from '../../../components/button/types-buttons/ButtonCreateType.jsx'
import DataTableType from '../../../components/table/dekstop/master/DataTableType.jsx'

function TypePages({ activePage, searchQuery }) {
  const [brandRefreshKey, setBrandRefreshKey] = useState(0)

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
          <ButtonCreateBrand
            onCreated={() => setBrandRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableType
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={brandRefreshKey}
      />
    </section>
  )
}

export default TypePages
