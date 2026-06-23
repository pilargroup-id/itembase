import { useState } from 'react'

import ButtonCreateBundle from '../../../components/button/bundles-buttons/ButtonCreateBundle.jsx'
import DataTableBundles from '../../../components/table/dekstop/items/DataTableBundles.jsx'

function BundlesPage({ activePage, searchQuery }) {
  const [bundleRefreshKey, setBundleRefreshKey] = useState(0)

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
          <ButtonCreateBundle
            onCreated={() => setBundleRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableBundles
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={bundleRefreshKey}
      />
    </section>
  )
}

export default BundlesPage
