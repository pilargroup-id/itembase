import DataTableParents from '../../../components/table/dekstop/items/dataTableParents.jsx'

function ParentsPage({ activePage, searchQuery, onSearchQueryChange }) {
  return (
    <section
      className="dashboard-panel users-table-card parents-table-card"
      aria-label={activePage.title}
    >
      <DataTableParents
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        tableLabel={`${activePage.title} table`}
      />
    </section>
  )
}

export default ParentsPage
