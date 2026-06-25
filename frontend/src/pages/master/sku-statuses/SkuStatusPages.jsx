import { useState } from 'react'

import ButtonCreateSkuStatus from '../../../components/button/sku-statuses-buttons/ButtonCreateSkuStatus.jsx'
import DataTableSkuStatuses from '../../../components/table/dekstop/master/DataTableSkuStatus.jsx'

function SkuStatusPages({ activePage, searchQuery }) {
  const [skuStatusRefreshKey, setSkuStatusRefreshKey] = useState(0)

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
          <ButtonCreateSkuStatus
            onCreated={() => setSkuStatusRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableSkuStatuses
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={skuStatusRefreshKey}
      />
    </section>
  )
}

export default SkuStatusPages
