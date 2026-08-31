import { XClose, XCircle } from '../template/TemplateIcons.jsx'

function ValidationAlertBanner({ message, title = 'Gagal', onDismiss }) {
  if (!message) {
    return null
  }

  return (
    <div className="item-create-popup__validation-alert" role="alert">
      <span className="item-create-popup__validation-alert-icon" aria-hidden="true">
        <XCircle size={18} />
      </span>

      <div className="item-create-popup__validation-alert-body">
        <p className="item-create-popup__validation-alert-title">{title}</p>
        <p className="item-create-popup__validation-alert-message">{message}</p>
      </div>

      <div className="item-create-popup__validation-alert-actions">
        <button
          type="button"
          className="item-create-popup__validation-alert-close"
          onClick={onDismiss}
          aria-label="Tutup notifikasi"
        >
          <XClose size={14} />
        </button>
      </div>
    </div>
  )
}

export default ValidationAlertBanner
