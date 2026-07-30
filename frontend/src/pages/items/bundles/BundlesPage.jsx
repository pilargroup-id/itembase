import { useState } from 'react'

import ButtonCreateBundle from '../../../components/button/bundles-buttons/ButtonCreateBundle.jsx'
import SearchBundle from '../../../components/search/SearchBundle.jsx'
import DataTableBundles, {
  DEFAULT_BUNDLE_SORT,
  bundleSortOptions,
  defaultBundleFilters,
} from '../../../components/table/dekstop/items/DataTableBundles.jsx'

function BundlesPage({ activePage, searchQuery, onSearchQueryChange }) {
  const [bundleRefreshKey, setBundleRefreshKey] = useState(0)
  const [bundleFilters, setBundleFilters] = useState(defaultBundleFilters)
  const [bundleSortValue, setBundleSortValue] = useState(DEFAULT_BUNDLE_SORT)

  const handleApplyFilters = ({ filters, sortValue }) => {
    setBundleFilters((currentFilters) => ({
      ...currentFilters,
      ...filters,
    }))
    setBundleSortValue(sortValue)
  }

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
          <SearchBundle
            value={searchQuery}
            onChange={onSearchQueryChange}
          />
          <ButtonCreateBundle
            onCreated={() => setBundleRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableBundles
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={bundleRefreshKey}
        filters={bundleFilters}
        sortValue={bundleSortValue}
        sortOptions={bundleSortOptions}
        onApplyFilters={handleApplyFilters}
      />
    </section>
  )
}

export default BundlesPage
