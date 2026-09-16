import { useState } from 'react'

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
      className="parents-table-card parents-table-page"
      aria-label={activePage.title}
    >
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
          onSearchQueryChange={onSearchQueryChange}
          tableLabel={`${activePage.title} table`}
          refreshKey={brandRefreshKey}
        />
      ) : (
        <DataTableSubBrands
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          tableLabel={`${activePage.title} sub brands table`}
          refreshKey={subBrandRefreshKey}
        />
      )}
    </section>
  )
}

export default BrandsPages
