import { useState } from 'react'

import ButtonCreateBrand from '../../../components/button/brands-buttons/ButtonCreateBrand.jsx'
import ButtonCreateSubBrands from '../../../components/button/sub-brands-buttons/SubButtonCreateBrand.jsx'
import ButtonImportMaster from '../../../components/button/master-buttons/ButtonImportMaster.jsx'
import ButtonExportMaster from '../../../components/button/master-buttons/ButtonExportMaster.jsx'
import SearchBrand from '../../../components/search/SearchBrand.jsx'
import DataTableBrands from '../../../components/table/dekstop/master/DataTableBrands.jsx'
import DataTableSubBrands from '../../../components/table/dekstop/master/DataTableSubBrands.jsx'

function BrandsPages({ activePage, searchQuery, onSearchQueryChange }) {
  const [brandRefreshKey, setBrandRefreshKey] = useState(0)
  const [subBrandRefreshKey, setSubBrandRefreshKey] = useState(0)
  const [activeBrandTab, setActiveBrandTab] = useState('brands')

  const brandTabs = [
    { id: 'brands', label: 'Brands' },
    { id: 'sub-brands', label: 'Sub Brands' },
  ]

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card brand-table-card"
      aria-label={activePage.title}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{activePage.eyebrow}</p>
          <h1 className="dashboard-panel__title">{activePage.title}</h1>
        </div>

        <div className="users-table-card__actions">
          <SearchBrand value={searchQuery} onChange={onSearchQueryChange} />
          {activeBrandTab === 'brands' ? (
            <>
              <ButtonCreateBrand
                onCreated={() => setBrandRefreshKey((currentKey) => currentKey + 1)}
              />
              <ButtonExportMaster
                type="brands"
                masterLabel="Brand"
                aria-label="Export brand data"
              />
              <ButtonImportMaster
                type="brands"
                masterLabel="Brand"
                aria-label="Import brand data"
                onImported={() => setBrandRefreshKey((currentKey) => currentKey + 1)}
              />
            </>
          ) : (
            <>
              <ButtonCreateSubBrands
                onCreated={() => setSubBrandRefreshKey((currentKey) => currentKey + 1)}
              />
              <ButtonExportMaster
                type="sub-brands"
                masterLabel="Sub Brand"
                aria-label="Export sub brand data"
              />
              <ButtonImportMaster
                type="sub-brands"
                masterLabel="Sub Brand"
                aria-label="Import sub brand data"
                onImported={() => setSubBrandRefreshKey((currentKey) => currentKey + 1)}
              />
            </>
          )}
        </div>
      </div>

      <div className="brand-table-tabs" role="tablist" aria-label="Brand tabs">
        {brandTabs.map((tab) => {
          const isActive = activeBrandTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              className={`brand-table-tabs__button${
                isActive ? ' brand-table-tabs__button--active' : ''
              }`}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveBrandTab(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeBrandTab === 'brands' ? (
        <DataTableBrands
          searchQuery={searchQuery}
          tableLabel={`${activePage.title} table`}
          refreshKey={brandRefreshKey}
        />
      ) : (
        <DataTableSubBrands
          searchQuery={searchQuery}
          tableLabel={`${activePage.title} sub brands table`}
          refreshKey={subBrandRefreshKey}
        />
      )}
    </section>
  )
}

export default BrandsPages
