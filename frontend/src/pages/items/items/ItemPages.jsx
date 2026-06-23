import { useState } from 'react'

import ButtonCreateItem from '../../../components/button/item-buttons/ButtonCreateItem.jsx'
import DataTableItem from '../../../components/table/dekstop/items/DataTableItem.jsx'

function ItemPages({ activePage, searchQuery }) {
  const [itemRefreshKey, setItemRefreshKey] = useState(0)

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
          <ButtonCreateItem
            onCreated={() => setItemRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableItem
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={itemRefreshKey}
      />
    </section>
  )
}

export default ItemPages
