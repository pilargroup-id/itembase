import { useState } from 'react'

import ButtonCreateCategories from '../../../components/button/categories-buttons/ButtonCreateCategories.jsx'
import SearchCategories from '../../../components/search/SearchCategories.jsx'
import DataTableCategories from '../../../components/table/dekstop/master/DataTableCategories.jsx'

function CategoriesPages({ activePage, searchQuery, onSearchQueryChange }) {
  const [categoriesRefreshKey, setCategoriesRefreshKey] = useState(0)

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
          <SearchCategories value={searchQuery} onChange={onSearchQueryChange} />
          <ButtonCreateCategories
            onCreated={() => setCategoriesRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableCategories
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={categoriesRefreshKey}
      />
    </section>
  )
}

export default CategoriesPages
