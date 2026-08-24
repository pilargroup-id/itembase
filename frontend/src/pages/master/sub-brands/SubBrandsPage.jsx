import { useState } from 'react'

import ButtonCreateSubBrands from '../../../components/button/sub-brands-buttons/SubButtonCreateBrand.jsx'
import SearchSubBrand from '../../../components/search/SearchSubBrand.jsx'
import DataTableSubBrands from '../../../components/table/dekstop/master/DataTableSubBrands.jsx'

function SubBrandsPage({ activePage, searchQuery, onSearchQueryChange }) {
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
          <SearchSubBrand value={searchQuery} onChange={onSearchQueryChange} />
          <ButtonCreateSubBrands
            onCreated={() => setBrandRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableSubBrands
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={brandRefreshKey}
      />
    </section>
  )
}

export default SubBrandsPage
