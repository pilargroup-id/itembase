import DataTableDashboard from '../../components/table/dekstop/DataTableDashboard.jsx'

function CanvasDashboard({ selectedKey = '' }) {
  return (
    <section className="dashboard-canvas" aria-label="Canvas dashboard">
      {selectedKey ? (
        <DataTableDashboard selectedKey={selectedKey} />
      ) : (
        <div className="dashboard-canvas__empty">
          <p className="dashboard-canvas__empty-title">Belum ada tabel dipilih.</p>
        </div>
      )}
    </section>
  )
}

export default CanvasDashboard
