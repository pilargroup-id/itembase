import { useState } from 'react'

import ButtonCreateItem from '../../../components/button/item-buttons/ButtonCreateItem.jsx'
import ButtonFilterItem from '../../../components/button/item-buttons/ButtonFilterItem.jsx'
import { itemFilterConfig } from '../../../components/dropdown/filter-item/FilterDropdownItem.config.js'

import SearchItem from '../../../components/search/SearchItem.jsx'
import DataTableItem, {
  DEFAULT_ITEM_SORT,
  defaultItemFilters,
  itemSortOptions,
} from '../../../components/table/dekstop/items/DataTableItem.jsx'

const visibleItemFilterConfigs = itemFilterConfig.filter((filterConfig) =>
  ['itemKind', 'parent', 'category', 'businessUnit', 'createdBy'].includes(filterConfig.key),
)

function ItemPages({ activePage, searchQuery, onSearchQueryChange }) {
  const [itemRefreshKey, setItemRefreshKey] = useState(0)
  const [itemFilters, setItemFilters] = useState(defaultItemFilters)
  const [itemSortValue, setItemSortValue] = useState(DEFAULT_ITEM_SORT)
  const [itemFilterOptions, setItemFilterOptions] = useState({})

  const handleApplyFilters = ({ filters, sortValue }) => {
    setItemFilters((currentFilters) => ({
      ...currentFilters,
      ...filters,
    }))
    setItemSortValue(sortValue)
  }

  const handleResetFilters = ({ filters, sortValue }) => {
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
          <ButtonFilterItem
            filterConfigs={visibleItemFilterConfigs}
            filterOptions={itemFilterOptions}
            filters={itemFilters}
            sortOptions={itemSortOptions}
            sortValue={itemSortValue}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
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
        onFilterOptionsChange={setItemFilterOptions}
      />
    </section>
  )
}

export default ItemPages
