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
    variant_attribute_id: '',
    variant_value_id: '',
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

  const handleVariantAttributeChange = (id, value) => {
    onChange?.(
      detailItems.map((item) =>
        item.id === id
          ? {
              ...item,
              variant_attribute_id: value,
              variant_value_id: '',
              item_variant: '',
            }
          : item,
      ),
    )
  }

  const handleVariantValueChange = (id, value, options) => {
    const selectedValue = options.find((option) => option.value === String(value ?? ''))

    onChange?.(
      detailItems.map((item) =>
        item.id === id
          ? {
              ...item,
              variant_value_id: value,
              item_variant: selectedValue?.label || '',
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
              <div className="register-user-popup__field parent-detail-item__field--variant-attribute">
                <label className="register-user-popup__label" htmlFor={`parent-detail-variant-attribute-${item.id}`}>
                  Variant Attribute
                </label>
                {DetailSearchableSelect ? (
                  <DetailSearchableSelect
                    id={`parent-detail-variant-attribute-${item.id}`}
                    label="Variant Attribute"
                    value={item.variant_attribute_id}
                    options={variantAttributeOptions}
                    placeholder="Pilih Attribute"
                    searchPlaceholder="Cari Attribute..."
                    emptyMessage="Attribute tidak ditemukan."
                    disabled={disabled}
                    onChange={(nextValue) =>
                      handleVariantAttributeChange(item.id, nextValue)
                    }
                  />
                ) : (
                  <select
                    id={`parent-detail-variant-attribute-${item.id}`}
                    className="register-user-popup__select"
                    value={item.variant_attribute_id}
                    onChange={(event) =>
                      handleVariantAttributeChange(item.id, event.target.value)
                    }
                    disabled={disabled}
                  >
                    <option value="">Pilih Attribute</option>
                    {variantAttributeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="register-user-popup__field parent-detail-item__field--variant-value">
                <label className="register-user-popup__label" htmlFor={`parent-detail-variant-value-${item.id}`}>
                  Variant Value
                </label>
                {(() => {
                  const variantValueOptions = getVariantValueOptions(item.variant_attribute_id)
                  const loadingVariantValues = getLoadingVariantValues(item.variant_attribute_id)

                  return DetailSearchableSelect ? (
                    <DetailSearchableSelect
                      id={`parent-detail-variant-value-${item.id}`}
                      label="Variant Value"
                      value={item.variant_value_id}
                      options={variantValueOptions}
                      placeholder="Pilih Value"
                      searchPlaceholder="Cari Value..."
                      emptyMessage="Value tidak ditemukan."
                      loading={loadingVariantValues}
                      disabled={
                        disabled ||
                        !item.variant_attribute_id ||
                        loadingVariantValues
                      }
                      onChange={(nextValue) =>
                        handleVariantValueChange(item.id, nextValue, variantValueOptions)
                      }
                    />
                  ) : (
                    <select
                      id={`parent-detail-variant-value-${item.id}`}
                      className="register-user-popup__select"
                      value={item.variant_value_id}
                      onChange={(event) =>
                        handleVariantValueChange(
                          item.id,
                          event.target.value,
                          variantValueOptions,
                        )
                      }
                      disabled={
                        disabled ||
                        !item.variant_attribute_id ||
                        loadingVariantValues
                      }
                    >
                      <option value="">
                        {loadingVariantValues ? 'Memuat value...' : 'Pilih Value'}
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
                <label className="register-user-popup__label" htmlFor={`parent-detail-hwd-height-${item.id}`}>
                  HWD
                </label>
                <div className="parent-detail-item__hwd-inputs">
                  {getHwdParts(item.hwd).map((partValue, partIndex) => {
                    const fieldLabels = ['Height', 'Width', 'Depth']
                    const fieldPlaceholders = ['H', 'W', 'D']

                    return (
                      <input
                        key={fieldLabels[partIndex]}
                        id={
                          partIndex === 0
                            ? `parent-detail-hwd-height-${item.id}`
                            : undefined
                        }
                        className="register-user-popup__input parent-detail-item__hwd-input"
                        value={partValue}
                        placeholder={fieldPlaceholders[partIndex]}
                        aria-label={`${fieldLabels[partIndex]} HWD`}
                        onChange={(event) =>
                          handleFieldChange(
                            item.id,
                            'hwd',
                            buildHwdValue(item.hwd, partIndex, event.target.value),
                          )
                        }
                        disabled={disabled}
                      />
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
