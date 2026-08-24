import { useMemo } from 'react'

import { Plus, Trash03 } from '../../../template/TemplateIcons.jsx'

function normalizeDetailItemText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function buildVariantDuplicateKey(itemName, variant) {
  const normalizedItemName = normalizeDetailItemText(itemName).toLowerCase()
  const normalizedVariant = normalizeDetailItemText(variant).toLowerCase()

  return normalizedVariant ? `${normalizedItemName}__${normalizedVariant}` : ''
}

export function hasDuplicateVariantSelection(items = [], itemName = '') {
  const seenKeys = new Set()

  return items.some((item) => {
    const key = buildVariantDuplicateKey(itemName, item.item_variant)

    if (!key) {
      return false
    }

    if (seenKeys.has(key)) {
      return true
    }

    seenKeys.add(key)
    return false
  })
}

function getDuplicateDetailItemIds(items, itemName) {
  const keyCounts = new Map()

  items.forEach((item) => {
    const key = buildVariantDuplicateKey(itemName, item.item_variant)

    if (key) {
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1)
    }
  })

  const duplicateIds = new Set()

  items.forEach((item) => {
    const key = buildVariantDuplicateKey(itemName, item.item_variant)

    if (key && keyCounts.get(key) > 1) {
      duplicateIds.add(item.id)
    }
  })

  return duplicateIds
}

function buildDetailItemTitle(itemName, variant, index) {
  const normalizedItemName = normalizeDetailItemText(itemName)
  const normalizedVariant = normalizeDetailItemText(variant)

  if (!normalizedItemName) {
    return `SKU #${index + 1}`
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

const hwdFieldLabels = ['Height', 'Width', 'Depth']
const hwdFieldNames = ['height', 'width', 'depth']

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
  onCreateUom = null,
  onCreateVariantValue = null,
  disabled = false,
  onChange,
}) {
  const detailItems = items.length ? items : [createInitialDetailItem()]
  const DetailSearchableSelect = SearchableSelect
  const duplicateDetailItemIds = useMemo(
    () => getDuplicateDetailItemIds(items, itemName),
    [items, itemName],
  )
  const hasDuplicateVariant = duplicateDetailItemIds.size > 0

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
          <h3 className="parent-create-popup__section-title">
            SKU Detail
            <span className="parent-detail-item__count">
              ({detailItems.length} SKU)
            </span>
          </h3>
        </div>

        <div className="parent-detail-item__actions">
          <button
            type="button"
            className="parent-detail-item__add"
            onClick={handleAddItem}
            disabled={disabled}
            title="Create Item"
            aria-label="Create Item"
          >
            <Plus size={18} />
            <span>Create Item</span>
          </button>
        </div>
      </div>

      {hasDuplicateVariant ? (
        <p className="register-user-popup__hint parent-detail-item__duplicate-hint" role="alert">
          Terdapat SKU dengan kombinasi Item Name + Varian yang sama. Ubah varian salah satu SKU agar tidak duplikat.
        </p>
      ) : null}

      <div className="parent-detail-item__table-wrapper">
        <table className="parent-detail-item__table" aria-label="SKU detail">
          <thead>
            <tr>
              <th scope="col" className="parent-detail-item__table-title-header">
                SKU Name
              </th>
              {variantAttributeOptions.map((attribute) => (
                <th key={attribute.value} scope="col">
                  {attribute.label}
                </th>
              ))}
              <th scope="col">Uom</th>
              {hwdFieldLabels.map((fieldLabel) => (
                <th key={fieldLabel} scope="col" className="parent-detail-item__table-hwd-header">
                  {fieldLabel} (cm)
                </th>
              ))}
              <th scope="col">Lead Time (Day)</th>
              <th scope="col" className="parent-detail-item__table-action-header">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {detailItems.map((item, index) => {
              const isDuplicateRow = duplicateDetailItemIds.has(item.id)

              return (
                <tr
                  key={item.id}
                  className={
                    isDuplicateRow ? 'parent-detail-item__row--duplicate' : undefined
                  }
                >
                <td className="parent-detail-item__table-title-cell">
                  <span className="parent-detail-item__row-index">{index + 1}</span>
                  <div className="parent-detail-item__row-title-group">
                    <p className="parent-detail-item__row-title">
                      {buildDetailItemTitle(itemName, item.item_variant, index)}
                    </p>
                    {isDuplicateRow ? (
                      <p className="parent-detail-item__row-duplicate-note" role="alert">
                        Varian duplikat
                      </p>
                    ) : null}
                  </div>
                </td>

                {variantAttributeOptions.map((attribute) => {
                  const variantValueOptions = getVariantValueOptions(attribute.value)
                  const loadingVariantValues = getLoadingVariantValues(attribute.value)
                  const fieldId = `parent-detail-variant-value-${attribute.value}-${item.id}`

                  return (
                    <td key={attribute.value} className="parent-detail-item__field--variant-value">
                      {DetailSearchableSelect ? (
                        <DetailSearchableSelect
                          id={fieldId}
                          label={attribute.label}
                          value={item.variant_values_by_attribute_id?.[attribute.value] || ''}
                          options={variantValueOptions}
                          placeholder={`Pilih ${attribute.label}`}
                          searchPlaceholder={`Cari ${attribute.label}...`}
                          emptyMessage="Value tidak ditemukan."
                          loading={loadingVariantValues}
                          disabled={disabled || loadingVariantValues}
                          allowCreate={Boolean(onCreateVariantValue)}
                          onCreate={
                            onCreateVariantValue
                              ? (nextName) => onCreateVariantValue(attribute.value, nextName)
                              : undefined
                          }
                          onChange={(nextValue) =>
                            handleVariantValueChange(item.id, attribute.value, nextValue)
                          }
                        />
                      ) : (
                        <select
                          id={fieldId}
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
                      )}
                    </td>
                  )
                })}

                <td className="parent-detail-item__field--uom">
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
                      allowCreate={Boolean(onCreateUom)}
                      onCreate={onCreateUom || undefined}
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
                </td>

                {getHwdParts(item.hwd).map((partValue, partIndex) => (
                  <td
                    key={hwdFieldLabels[partIndex]}
                    className="parent-detail-item__field--hwd"
                  >
                    <input
                      id={`parent-detail-hwd-${hwdFieldNames[partIndex]}-${item.id}`}
                      className="register-user-popup__input parent-detail-item__hwd-input"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={partValue}
                      placeholder="0"
                      aria-label={`${hwdFieldLabels[partIndex]} (cm)`}
                      onChange={(event) =>
                        handleFieldChange(
                          item.id,
                          'hwd',
                          buildHwdValue(item.hwd, partIndex, event.target.value),
                        )
                      }
                      disabled={disabled}
                    />
                  </td>
                ))}

                <td className="parent-detail-item__field--lead-time">
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
                </td>

                <td className="parent-detail-item__table-action-cell">
                  <button
                    type="button"
                    className="users-table__icon-button users-table__icon-button--danger parent-detail-item__remove"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={disabled || detailItems.length <= 1}
                    title="Hapus SKU"
                    aria-label={`Hapus SKU ${index + 1}`}
                  >
                    <Trash03 size={16} />
                  </button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CreateDetailItem
