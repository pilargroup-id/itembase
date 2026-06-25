import { useState } from 'react'

import ButtonCreatePicUser from '../../../components/button/pic-users-buttons/ButtonCreatePicUser.jsx'
import DataTablePicUser from '../../../components/table/dekstop/master/DataTablePicUser.jsx'

function PicUserPages({ activePage, searchQuery }) {
  const [picUserRefreshKey, setPicUserRefreshKey] = useState(0)

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
          <ButtonCreatePicUser
            onCreated={() => setPicUserRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTablePicUser
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={picUserRefreshKey}
      />
    </section>
  )
}

export default PicUserPages
