import { useState } from 'react'

import ButtonCreateBrand from '../../../components/button/types-buttons/ButtonCreateType.jsx'
import ButtonImportMaster from '../../../components/button/master-buttons/ButtonImportMaster.jsx'
import ButtonExportMaster from '../../../components/button/master-buttons/ButtonExportMaster.jsx'
import SearchType from '../../../components/search/SearchType.jsx'
import DataTableType from '../../../components/table/dekstop/master/DataTableType.jsx'

function TypePages({ activePage, searchQuery, onSearchQueryChange }) {
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
          <ButtonExportMaster
            type="item-sources"
            masterLabel="Type"
            aria-label="Export type data"
          />
          <ButtonImportMaster
            type="item-sources"
            masterLabel="Type"
            aria-label="Import type data"
            onImported={() => setBrandRefreshKey((currentKey) => currentKey + 1)}
          />
          <SearchType value={searchQuery} onChange={onSearchQueryChange} />
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
