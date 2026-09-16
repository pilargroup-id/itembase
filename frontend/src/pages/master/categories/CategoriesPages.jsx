import DataTableCategories from '../../../components/table/dekstop/master/DataTableCategories.jsx'

function CategoriesPages({ activePage, searchQuery, onSearchQueryChange }) {
  return (
    <section
      className="parents-table-card parents-table-page"
      aria-label={activePage.title}
    >
      <DataTableCategories
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        tableLabel={`${activePage.title} table`}
      />
    </section>
  )
}

export default CategoriesPages
