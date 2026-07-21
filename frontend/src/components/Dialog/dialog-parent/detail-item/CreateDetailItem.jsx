import { Plus, Trash03 } from '../../../template/TemplateIcons.jsx'

function createDetailItemId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `detail-item-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createInitialDetailItem() {
  return {
    id: createDetailItemId(),
    item_variant: '',
    uom_id: '',
    hwd: '',
    lead_time_days: '',
  }
}

function CreateDetailItem({
  items = [],
  uomOptions = [],
  loadingUoms = false,
  disabled = false,
  onChange,
}) {
  const detailItems = items.length ? items : [createInitialDetailItem()]

  const handleAddItem = () => {
    onChange?.([...detailItems, createInitialDetailItem()])
  }

  const handleRemoveItem = (id) => {
    if (detailItems.length <= 1) {
      return
    }

    onChange?.(detailItems.filter((item) => item.id !== id))
  }

  const handleFieldChange = (id, fieldName, value) => {
    onChange?.(
      detailItems.map((item) =>
        item.id === id
          ? {
              ...item,
              [fieldName]: value,
            }
          : item,
      ),
    )
  }

  return (
    <div className="parent-create-popup__section parent-detail-item">
      <div className="parent-detail-item__top">
        <div className="parent-create-popup__section-header">
          <h3 className="parent-create-popup__section-title">Item Detail</h3>
        </div>

        <div className="parent-detail-item__actions">
          <span className="parent-detail-item__count">
            {detailItems.length} item
          </span>
        </div>
      </div>

      <div className="parent-detail-item__items">
        {detailItems.map((item, index) => (
          <div key={item.id} className="parent-detail-item__row">
            <div className="parent-detail-item__row-header">
              <p className="parent-detail-item__row-title">Item Detail #{index + 1}</p>
              <div className="parent-detail-item__row-actions">
                {index === detailItems.length - 1 ? (
                  <button
                    type="button"
                    className="parent-detail-item__add"
                    onClick={handleAddItem}
                    disabled={disabled}
                    title="Tambah item detail"
                    aria-label="Tambah item detail"
                  >
                    <Plus size={16} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="parent-detail-item__remove"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={disabled || detailItems.length <= 1}
                  title="Hapus item detail"
                  aria-label={`Hapus item detail ${index + 1}`}
                >
                  <Trash03 size={16} />
                </button>
              </div>
            </div>

            <div className="parent-detail-item__grid">
              <div className="register-user-popup__field">
                <label className="register-user-popup__label" htmlFor={`parent-detail-item-variant-${item.id}`}>
                  Item + Variant
                </label>
                <input
                  id={`parent-detail-item-variant-${item.id}`}
                  className="register-user-popup__input"
                  value={item.item_variant}
                  placeholder="BACKPACK KIDS BLUE"
                  onChange={(event) =>
                    handleFieldChange(item.id, 'item_variant', event.target.value)
                  }
                  disabled={disabled}
                />
              </div>

              <div className="register-user-popup__field">
                <label className="register-user-popup__label" htmlFor={`parent-detail-uom-${item.id}`}>
                  Uom
                </label>
                <select
                  id={`parent-detail-uom-${item.id}`}
                  className="register-user-popup__select"
                  value={item.uom_id}
                  onChange={(event) =>
                    handleFieldChange(item.id, 'uom_id', event.target.value)
                  }
                  disabled={disabled || loadingUoms}
                >
                  <option value="">
                    {loadingUoms ? 'Memuat UOM...' : 'Pilih UOM'}
                  </option>
                  {uomOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="register-user-popup__field">
                <label className="register-user-popup__label" htmlFor={`parent-detail-hwd-${item.id}`}>
                  HWD
                </label>
                <input
                  id={`parent-detail-hwd-${item.id}`}
                  className="register-user-popup__input"
                  value={item.hwd}
                  placeholder="25 x 8 x 8"
                  onChange={(event) =>
                    handleFieldChange(item.id, 'hwd', event.target.value)
                  }
                  disabled={disabled}
                />
              </div>

              <div className="register-user-popup__field">
                <label className="register-user-popup__label" htmlFor={`parent-detail-lead-time-${item.id}`}>
                  Lead Time (Day)
                </label>
                <input
                  id={`parent-detail-lead-time-${item.id}`}
                  className="register-user-popup__input"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={item.lead_time_days}
                  placeholder="10"
                  onChange={(event) =>
                    handleFieldChange(item.id, 'lead_time_days', event.target.value)
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CreateDetailItem
