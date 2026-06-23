import { useState } from 'react'

import ButtonCreateParent from '../../../components/button/parents-buttons/ButtonCreateParent.jsx'
import DataTableParents from '../../../components/table/dekstop/items/dataTableParents.jsx'

function ParentsPage({ activePage, searchQuery }) {
  const [parentRefreshKey, setParentRefreshKey] = useState(0)

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
          <ButtonCreateParent
            onCreated={() => setParentRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableParents
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={parentRefreshKey}
      />
    </section>
  )
}

export default ParentsPage
