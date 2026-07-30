import { useState } from 'react'

import ButtonCreateItem from '../../../components/button/item-buttons/ButtonCreateItem.jsx'

import SearchItem from '../../../components/search/SearchItem.jsx'
import DataTableItem, {
  DEFAULT_ITEM_SORT,
  defaultItemFilters,
  itemSortOptions,
} from '../../../components/table/dekstop/items/DataTableItem.jsx'

function ItemPages({ activePage, searchQuery, onSearchQueryChange }) {
  const [itemRefreshKey, setItemRefreshKey] = useState(0)
  const [itemFilters, setItemFilters] = useState(defaultItemFilters)
  const [itemSortValue, setItemSortValue] = useState(DEFAULT_ITEM_SORT)

  const handleApplyFilters = ({ filters, sortValue }) => {
    setItemFilters((currentFilters) => ({
      ...currentFilters,
      ...filters,
    }))
    setItemSortValue(sortValue)
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
          <SearchItem
            value={searchQuery}
            onChange={onSearchQueryChange}
          />
          <ButtonCreateItem
            onCreated={() => setItemRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableItem
        searchQuery={searchQuery}
        tableLabel={`${activePage.title} table`}
        refreshKey={itemRefreshKey}
        filters={itemFilters}
        sortValue={itemSortValue}
        sortOptions={itemSortOptions}
        onApplyFilters={handleApplyFilters}
      />
    </section>
  )
}

export default ItemPages
