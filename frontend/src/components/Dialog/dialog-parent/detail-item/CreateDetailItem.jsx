import { Plus, Trash03 } from '../../../template/TemplateIcons.jsx'

function normalizeDetailItemText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function buildDetailItemTitle(itemName, variant, index) {
  const normalizedItemName = normalizeDetailItemText(itemName)
  const normalizedVariant = normalizeDetailItemText(variant)

  if (!normalizedItemName) {
    return `Item Detail #${index + 1}`
  }

  return normalizedVariant
    ? `${normalizedItemName} ${normalizedVariant}`
    : `${normalizedItemName}...`
}

function createDetailItemId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `detail-item-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getHwdParts(value) {
  const parts = String(value ?? '')
    .split(/\s*x\s*/i)
    .map((part) => part.trim())

  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? '']
}

function buildHwdValue(currentValue, partIndex, nextPartValue) {
  const parts = getHwdParts(currentValue)

  parts[partIndex] = nextPartValue

  return parts.map((part) => part.trim()).join(' x ')
}

export function createInitialDetailItem() {
  return {
    id: createDetailItemId(),
    item_variant: '',
    variant_values_by_attribute_id: {},
    uom_id: '',
    hwd: '',
    lead_time_days: '',
  }
}

function CreateDetailItem({
  itemName = '',
  items = [],
  uomOptions = [],
  variantAttributeOptions = [],
  getVariantValueOptions = () => [],
  getLoadingVariantValues = () => false,
  loadingUoms = false,
  SearchableSelect = null,
  disabled = false,
  onChange,
}) {
  const detailItems = items.length ? items : [createInitialDetailItem()]
  const DetailSearchableSelect = SearchableSelect

  const buildSelectedVariantLabel = (nextValuesByAttributeId) =>
    variantAttributeOptions
      .map((attribute) => {
        const selectedValueId = nextValuesByAttributeId[attribute.value]
        const selectedValue = getVariantValueOptions(attribute.value).find(
          (option) => option.value === String(selectedValueId ?? ''),
        )

        return selectedValue?.label || ''
      })
      .filter(Boolean)
      .join(' ')

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

  const handleVariantValueChange = (id, attributeId, value) => {
    onChange?.(
      detailItems.map((item) =>
        (() => {
          if (item.id !== id) {
            return item
          }

          const nextValuesByAttributeId = {
            ...(item.variant_values_by_attribute_id || {}),
            [attributeId]: value,
          }

          return {
            ...item,
            variant_values_by_attribute_id: nextValuesByAttributeId,
            item_variant: buildSelectedVariantLabel(nextValuesByAttributeId),
          }
        })(),
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
              <p className="parent-detail-item__row-title">
                {buildDetailItemTitle(itemName, item.item_variant, index)}
              </p>
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
              {variantAttributeOptions.map((attribute) => (
                <div key={attribute.value} className="register-user-popup__field parent-detail-item__field--variant-value">
                  <label className="register-user-popup__label" htmlFor={`parent-detail-variant-value-${attribute.value}-${item.id}`}>
                    {attribute.label}
                  </label>
                  {(() => {
                    const variantValueOptions = getVariantValueOptions(attribute.value)
                    const loadingVariantValues = getLoadingVariantValues(attribute.value)

                    return DetailSearchableSelect ? (
                      <DetailSearchableSelect
                        id={`parent-detail-variant-value-${attribute.value}-${item.id}`}
                        label={attribute.label}
                        value={item.variant_values_by_attribute_id?.[attribute.value] || ''}
                        options={variantValueOptions}
                        placeholder={`Pilih ${attribute.label}`}
                        searchPlaceholder={`Cari ${attribute.label}...`}
                        emptyMessage="Value tidak ditemukan."
                        loading={loadingVariantValues}
                        disabled={disabled || loadingVariantValues}
                        onChange={(nextValue) =>
                          handleVariantValueChange(item.id, attribute.value, nextValue)
                        }
                      />
                    ) : (
                      <select
                        id={`parent-detail-variant-value-${attribute.value}-${item.id}`}
                        className="register-user-popup__select"
                        value={item.variant_values_by_attribute_id?.[attribute.value] || ''}
                        onChange={(event) =>
                          handleVariantValueChange(item.id, attribute.value, event.target.value)
                        }
                        disabled={disabled || loadingVariantValues}
                      >
                        <option value="">
                          {loadingVariantValues ? 'Memuat value...' : `Pilih ${attribute.label}`}
                        </option>
                        {variantValueOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )
                  })()}
                </div>
              ))}

              <div className="register-user-popup__field parent-detail-item__field--uom">
                <label className="register-user-popup__label" htmlFor={`parent-detail-uom-${item.id}`}>
                  Uom
                </label>
                {DetailSearchableSelect ? (
                  <DetailSearchableSelect
                    id={`parent-detail-uom-${item.id}`}
                    label="Uom"
                    value={item.uom_id}
                    options={uomOptions}
                    placeholder="Pilih UOM"
                    searchPlaceholder="Cari UOM..."
                    emptyMessage="UOM tidak ditemukan."
                    loading={loadingUoms}
                    disabled={disabled || loadingUoms}
                    onChange={(nextValue) =>
                      handleFieldChange(item.id, 'uom_id', nextValue)
                    }
                  />
                ) : (
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
                )}
              </div>

              <div className="register-user-popup__field parent-detail-item__field--hwd">
                <div className="parent-detail-item__hwd-inputs">
                  {getHwdParts(item.hwd).map((partValue, partIndex) => {
                    const fieldLabels = ['Height', 'Width', 'Depth']
                    const fieldNames = ['height', 'width', 'depth']
                    const inputId = `parent-detail-hwd-${fieldNames[partIndex]}-${item.id}`

                    return (
                      <div
                        key={fieldLabels[partIndex]}
                        className="parent-detail-item__hwd-field"
                      >
                        <label className="register-user-popup__label" htmlFor={inputId}>
                          {fieldLabels[partIndex]}
                        </label>
                        <div className="parent-detail-item__input-with-unit">
                          <input
                            id={inputId}
                            className="register-user-popup__input parent-detail-item__hwd-input parent-detail-item__input--with-unit"
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={partValue}
                            placeholder="0"
                            onChange={(event) =>
                              handleFieldChange(
                                item.id,
                                'hwd',
                                buildHwdValue(item.hwd, partIndex, event.target.value),
                              )
                            }
                            disabled={disabled}
                          />
                          <span className="parent-detail-item__unit" aria-hidden="true">
                            cm
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="register-user-popup__field parent-detail-item__field--lead-time">
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
