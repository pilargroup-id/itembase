import DataTableUom from '../../../components/table/dekstop/master/DataTableUom.jsx'

function UomsPages({ activePage, searchQuery, onSearchQueryChange }) {
  return (
    <section
      className="parents-table-card parents-table-page"
      aria-label={activePage.title}
    >
      <DataTableUom
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        tableLabel={`${activePage.title} table`}
      />
    </section>
  )
}

export default UomsPages
