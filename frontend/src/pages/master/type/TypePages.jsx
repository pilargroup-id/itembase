import DataTableType from '../../../components/table/dekstop/master/DataTableType.jsx'

function TypePages({ activePage, searchQuery, onSearchQueryChange }) {
  return (
    <section
      className="parents-table-card parents-table-page"
      aria-label={activePage.title}
    >
      <DataTableType
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        tableLabel={`${activePage.title} table`}
      />
    </section>
  )
}

export default TypePages
