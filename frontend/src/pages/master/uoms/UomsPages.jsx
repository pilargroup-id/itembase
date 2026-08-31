import { useState } from 'react'
import ButtonCreateUom from '../../../components/button/uoms-buttons/ButtonCreateUom.jsx'
import ButtonImportMaster from '../../../components/button/master-buttons/ButtonImportMaster.jsx'
import ButtonExportMaster from '../../../components/button/master-buttons/ButtonExportMaster.jsx'
import SearchUom from '../../../components/search/SearchUom.jsx'
import DataTableUom from '../../../components/table/dekstop/master/DataTableUom.jsx'

function UomsPages({ activePage, searchQuery, onSearchQueryChange }) {
  const [uomRefreshKey, setUomRefreshKey] = useState(0)

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
            type="uoms"
            masterLabel="UOM"
            aria-label="Export UOM data"
          />
          <ButtonImportMaster
            type="uoms"
            masterLabel="UOM"
            aria-label="Import UOM data"
            onImported={() => setUomRefreshKey((currentKey) => currentKey + 1)}
          />
          <SearchUom value={searchQuery} onChange={onSearchQueryChange} />
          <ButtonCreateUom
            onCreated={() => setUomRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableUom
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={uomRefreshKey}
      />
    </section>
  )
}

export default UomsPages
