import DataTableItem from '../../../components/table/dekstop/items/DataTableItem.jsx'

function ItemPages({ activePage, searchQuery, onSearchQueryChange }) {
  return (
    <section
      className="parents-table-card parents-table-page"
      aria-label={activePage.title}
    >
      <DataTableItem
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        tableLabel={`${activePage.title} table`}
      />
    </section>
  )
}

export default ItemPages
