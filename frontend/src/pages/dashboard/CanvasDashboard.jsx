import DataTableDashboard from '../../components/table/dekstop/DataTableDashboard.jsx'
import ButtonExportDashboard from '../../components/button/dashboard-buttons/ButtonExportDashboard.jsx'
import { Export01 } from '../../components/template/TemplateIcons.jsx'

function CanvasDashboard({ selectedKey = '' }) {
  return (
    <section className="dashboard-canvas" aria-label="Canvas dashboard">
      <div className="dashboard-canvas__toolbar">
        <ButtonExportDashboard variant="action" aria-label="Export dashboard data">
          <Export01 size={18} aria-hidden="true" />
          <span>Export</span>
        </ButtonExportDashboard>
      </div>

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
