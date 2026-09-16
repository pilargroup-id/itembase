import DataTableBundles from '../../../components/table/dekstop/items/DataTableBundles.jsx'

function BundlesPage({ activePage, searchQuery, onSearchQueryChange }) {
  return (
    <section
      className="parents-table-card parents-table-page"
      aria-label={activePage.title}
    >
      <DataTableBundles
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        tableLabel={`${activePage.title} table`}
      />
    </section>
  )
}

export default BundlesPage
