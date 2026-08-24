import { useState } from 'react'

import ButtonCreatePics from '../../../components/button/pics-buttons/ButtonCreatePics.jsx'
import SearchPic from '../../../components/search/SearchPic.jsx'
import DataTablePics from '../../../components/table/dekstop/master/DataTablePics.jsx'

function PicsPages({ activePage, searchQuery, onSearchQueryChange }) {
  const [picsRefreshKey, setPicsRefreshKey] = useState(0)

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
          <SearchPic value={searchQuery} onChange={onSearchQueryChange} />
          <ButtonCreatePics
            onCreated={() => setPicsRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTablePics
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={picsRefreshKey}
      />
    </section>
  )
}

export default PicsPages
