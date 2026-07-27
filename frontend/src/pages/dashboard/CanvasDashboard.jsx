import DataTableDashboard from '../../components/table/dekstop/DataTableDashboard.jsx'
import ButtonDownloadDashboard from '../../components/button/dashboard-buttons/ButtonDownloadDashboard.jsx'
import { FileText01 } from '../../components/template/TemplateIcons.jsx'

function CanvasDashboard({ selectedKey = '' }) {
  return (
    <section className="dashboard-canvas" aria-label="Canvas dashboard">
      <div className="dashboard-canvas__toolbar">
        <ButtonDownloadDashboard variant="action" aria-label="Download dashboard data">
          <FileText01 size={18} aria-hidden="true" />
          <span>Download</span>
        </ButtonDownloadDashboard>
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
