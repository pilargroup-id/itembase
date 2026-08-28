import { useEffect, useMemo, useState } from 'react'

import { ChevronDown, Plus, Trash03 } from '../../../template/TemplateIcons.jsx'

function normalizeDetailItemText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function getSelectedIds(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '')).filter(Boolean)
  }

  const normalizedValue = normalizeDetailItemText(value)

  return normalizedValue ? [normalizedValue] : []
}

function isRowEnabled(item) {
  return item.create !== false
}

function buildVariantDuplicateKey(itemName, variant) {
  const normalizedItemName = normalizeDetailItemText(itemName).toLowerCase()
  const normalizedVariant = normalizeDetailItemText(variant).toLowerCase()

  return normalizedVariant ? `${normalizedItemName}__${normalizedVariant}` : ''
}

export function hasDuplicateVariantSelection(items = [], itemName = '') {
  const seenKeys = new Set()

  return items
    .filter(isRowEnabled)
    .some((item) => {
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
  const enabledItems = items.filter(isRowEnabled)
  const keyCounts = new Map()

  enabledItems.forEach((item) => {
    const key = buildVariantDuplicateKey(itemName, item.item_variant)

    if (key) {
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1)
    }
  })

  const duplicateIds = new Set()

  enabledItems.forEach((item) => {
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
const syncableDimensionFieldNames = ['uom_id', 'hwd', 'lead_time_days']
const MAX_VARIANT_VALUES_PER_ATTRIBUTE = 5

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

function buildAttributeComboKey(attributes, valuesByAttributeId) {
  return attributes
    .map((attribute) => `${attribute.value}:${valuesByAttributeId[attribute.value] ?? ''}`)
    .sort()
    .join('|')
}

function cartesianCombineAttributeValues(attributes, selectionsByAttributeId) {
  return attributes.reduce(
    (rows, attribute) => {
      const valueIds = getSelectedIds(selectionsByAttributeId[attribute.value])

      if (valueIds.length === 0) {
        return []
      }

      const nextRows = []

      rows.forEach((row) => {
        valueIds.forEach((valueId) => {
          nextRows.push({ ...row, [attribute.value]: valueId })
        })
      })

      return nextRows
    },
    [{}],
  )
}

function buildVariantLabelFromValues(attributes, valuesByAttributeId, getVariantValueOptions) {
  return attributes
    .map((attribute) => {
      const selectedValueId = valuesByAttributeId[attribute.value]
      const selectedValue = getVariantValueOptions(attribute.value).find(
        (option) => option.value === String(selectedValueId ?? ''),
      )

      return selectedValue?.label ? selectedValue.label.toUpperCase() : ''
    })
    .filter(Boolean)
    .join(' ')
}

function buildMatrixDetailItems(attributes, combinations, previousItems, getVariantValueOptions) {
  const previousByKey = new Map(
    previousItems.map((item) => [
      buildAttributeComboKey(attributes, item.variant_values_by_attribute_id || {}),
      item,
    ]),
  )

  return combinations.map((valuesByAttributeId) => {
    const key = buildAttributeComboKey(attributes, valuesByAttributeId)
    const existingItem = previousByKey.get(key)
    const itemVariant = buildVariantLabelFromValues(
      attributes,
      valuesByAttributeId,
      getVariantValueOptions,
    )

    if (existingItem) {
      return {
        ...existingItem,
        variant_values_by_attribute_id: valuesByAttributeId,
        item_variant: itemVariant,
      }
    }

    return {
      id: createDetailItemId(),
      create: true,
      item_variant: itemVariant,
      variant_values_by_attribute_id: valuesByAttributeId,
      uom_id: '',
      hwd: '',
      lead_time_days: '',
    }
  })
}

function NativeVariantValueCheckboxList({
  value = [],
  options = [],
  loading = false,
  disabled = false,
  emptyMessage = 'Value not found.',
  onToggle,
}) {
  const selectedIds = getSelectedIds(value)

  if (loading) {
    return <p className="register-user-popup__hint">Loading value...</p>
  }

  if (options.length === 0) {
    return <p className="register-user-popup__hint">{emptyMessage}</p>
  }

  return (
    <div className="parent-detail-item__native-checkbox-list">
      {options.map((option) => (
        <label key={option.value} className="parent-detail-item__native-checkbox-option">
          <input
            type="checkbox"
            className="register-user-popup__dropdown-checkbox"
            checked={selectedIds.includes(option.value)}
            disabled={disabled}
            onChange={() => onToggle?.(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
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
  VariantMultiSelect = null,
  onCreateUom = null,
  onCreateVariantValue = null,
  disabled = false,
  isParentSectionOpen = true,
  onToggleParentSection = null,
  onChange,
}) {
  const isMatrixMode = variantAttributeOptions.length > 0
  const detailItems = isMatrixMode ? items : items.length ? items : [createInitialDetailItem()]
  const DetailSearchableSelect = SearchableSelect
  const DetailVariantMultiSelect = VariantMultiSelect
  const [syncAllDimensions, setSyncAllDimensions] = useState(false)
  const [variantValueSelections, setVariantValueSelections] = useState({})
  const [matrixSelectionError, setMatrixSelectionError] = useState('')
  const [previousIsMatrixMode, setPreviousIsMatrixMode] = useState(isMatrixMode)

  if (isMatrixMode !== previousIsMatrixMode) {
    setPreviousIsMatrixMode(isMatrixMode)

    if (!isMatrixMode) {
      setVariantValueSelections({})
      setMatrixSelectionError('')
    }
  }

  const duplicateDetailItemIds = useMemo(
    () => getDuplicateDetailItemIds(items, itemName),
    [items, itemName],
  )
  const hasDuplicateVariant = duplicateDetailItemIds.size > 0

  const variantAttributeKey = useMemo(
    () => variantAttributeOptions.map((attribute) => attribute.value).join('|'),
    [variantAttributeOptions],
  )
  const hasCompleteMatrixSelection =
    isMatrixMode &&
    variantAttributeOptions.every(
      (attribute) => getSelectedIds(variantValueSelections[attribute.value]).length > 0,
    )

  useEffect(() => {
    if (!hasCompleteMatrixSelection) {
      return
    }

    const combinations = cartesianCombineAttributeValues(variantAttributeOptions, variantValueSelections)
    const nextItems = buildMatrixDetailItems(
      variantAttributeOptions,
      combinations,
      items,
      getVariantValueOptions,
    )

    onChange?.(nextItems)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCompleteMatrixSelection, variantAttributeKey, JSON.stringify(variantValueSelections)])

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
    const isFirstRow = detailItems[0]?.id === id
    const shouldSyncField =
      syncAllDimensions && isFirstRow && syncableDimensionFieldNames.includes(fieldName)

    onChange?.(
      detailItems.map((item) => {
        if (item.id === id) {
          return { ...item, [fieldName]: value }
        }

        if (shouldSyncField) {
          return { ...item, [fieldName]: value }
        }

        return item
      }),
    )
  }

  const handleSyncAllDimensionsToggle = (event) => {
    const checked = event.target.checked

    setSyncAllDimensions(checked)

    if (checked && detailItems.length > 1) {
      const firstRowValues = Object.fromEntries(
        syncableDimensionFieldNames.map((fieldName) => [fieldName, detailItems[0][fieldName]]),
      )

      onChange?.(
        detailItems.map((item, index) => (index === 0 ? item : { ...item, ...firstRowValues })),
      )
    }
  }

  const handleRowCreateToggle = (id) => {
    onChange?.(
      detailItems.map((item) =>
        item.id === id ? { ...item, create: !isRowEnabled(item) } : item,
      ),
    )
  }

  const handleVariantSelectionToggle = (attributeId, valueId) => {
    const normalizedAttributeId = String(attributeId ?? '')
    const normalizedValueId = String(valueId ?? '')
    const selectedValueIds = getSelectedIds(variantValueSelections[normalizedAttributeId])
    const isSelected = selectedValueIds.includes(normalizedValueId)

    if (!isSelected && selectedValueIds.length >= MAX_VARIANT_VALUES_PER_ATTRIBUTE) {
      setMatrixSelectionError(`Maximum ${MAX_VARIANT_VALUES_PER_ATTRIBUTE} values per variant attribute.`)
      return
    }

    setMatrixSelectionError('')
    setVariantValueSelections((currentSelections) => {
      const currentSelectedValueIds = getSelectedIds(currentSelections[normalizedAttributeId])
      const isCurrentlySelected = currentSelectedValueIds.includes(normalizedValueId)

      return {
        ...currentSelections,
        [normalizedAttributeId]: isCurrentlySelected
          ? currentSelectedValueIds.filter(
              (selectedValueId) => selectedValueId !== normalizedValueId,
            )
          : [...currentSelectedValueIds, normalizedValueId],
      }
    })
  }

  const enabledDetailItemCount = isMatrixMode && !hasCompleteMatrixSelection
    ? 0
    : detailItems.filter(isRowEnabled).length

  return (
    <div className="parent-create-popup__section parent-detail-item">
      <div className="parent-detail-item__top">
        <div className="parent-create-popup__section-header">
          <h3 className="parent-create-popup__section-title">
            SKU Detail
            <span className="parent-detail-item__count">
              ({enabledDetailItemCount} SKU)
            </span>
          </h3>
        </div>

        <div className="parent-detail-item__actions">
          {(isMatrixMode ? hasCompleteMatrixSelection : true) && detailItems.length > 1 ? (
            <label
              className="parent-detail-item__sync-toggle"
              title="Isi dimensi carton di baris pertama, baris lain otomatis mengikuti."
            >
              <input
                type="checkbox"
                className="register-user-popup__dropdown-checkbox"
                checked={syncAllDimensions}
                disabled={disabled}
                onChange={handleSyncAllDimensionsToggle}
              />
              <span>Samakan dimensi carton</span>
            </label>
          ) : null}

          {!isMatrixMode ? (
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
          ) : null}

          {onToggleParentSection ? (
            <button
              type="button"
              className="parent-detail-item__toggle-parent"
              onClick={onToggleParentSection}
              disabled={disabled}
              aria-expanded={isParentSectionOpen}
              title={isParentSectionOpen ? 'Hide Parent' : 'Show Parent'}
              aria-label={isParentSectionOpen ? 'Hide Parent' : 'Show Parent'}
            >
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`parent-detail-item__toggle-parent-chevron${
                  isParentSectionOpen ? ' parent-detail-item__toggle-parent-chevron--open' : ''
                }`}
              />
              <span>{isParentSectionOpen ? 'Hide Parent' : 'Show Parent'}</span>
            </button>
          ) : null}
        </div>
      </div>

      {isMatrixMode ? (
        <div className="item-create-popup__variant-grid">
          {variantAttributeOptions.map((attribute) => {
            const variantValueOptions = getVariantValueOptions(attribute.value)
            const loadingVariantValues = getLoadingVariantValues(attribute.value)
            const fieldId = `parent-detail-matrix-variant-${attribute.value}`

            return (
              <div key={attribute.value} className="register-user-popup__field">
                <label className="register-user-popup__label" htmlFor={fieldId}>
                  {attribute.label}
                </label>
                {DetailVariantMultiSelect ? (
                  <DetailVariantMultiSelect
                    id={fieldId}
                    label={attribute.label}
                    value={variantValueSelections[attribute.value] || []}
                    options={variantValueOptions}
                    placeholder={`Select ${attribute.label}`}
                    searchPlaceholder={`Search ${attribute.label}...`}
                    emptyMessage="Value not found."
                    loading={loadingVariantValues}
                    disabled={disabled || loadingVariantValues}
                    maxSelectable={MAX_VARIANT_VALUES_PER_ATTRIBUTE}
                    allowCreate={Boolean(onCreateVariantValue)}
                    uppercase
                    onCreate={
                      onCreateVariantValue
                        ? (nextName) => onCreateVariantValue(attribute.value, nextName)
                        : undefined
                    }
                    onToggle={(valueId) => handleVariantSelectionToggle(attribute.value, valueId)}
                  />
                ) : (
                  <NativeVariantValueCheckboxList
                    value={variantValueSelections[attribute.value] || []}
                    options={variantValueOptions}
                    loading={loadingVariantValues}
                    disabled={disabled || loadingVariantValues}
                    onToggle={(valueId) => handleVariantSelectionToggle(attribute.value, valueId)}
                  />
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {matrixSelectionError ? (
        <p className="register-user-popup__hint parent-detail-item__duplicate-hint" role="alert">
          {matrixSelectionError}
        </p>
      ) : null}

      {hasDuplicateVariant ? (
        <p className="register-user-popup__hint parent-detail-item__duplicate-hint" role="alert">
          There are SKUs with the same Item Name + Variant combination. Change the variant of one SKU so it is not duplicated.
        </p>
      ) : null}

      {isMatrixMode && !hasCompleteMatrixSelection ? (
        <p className="register-user-popup__hint">
          Select at least one value for each variant attribute to generate the SKU matrix.
        </p>
      ) : (
        <div className="parent-detail-item__table-wrapper">
          <table className="parent-detail-item__table" aria-label="SKU detail">
            <thead>
              <tr>
                {isMatrixMode ? (
                  <th scope="col" className="parent-detail-item__table-create-header">
                    Create
                  </th>
                ) : null}
                {isMatrixMode ? (
                  <th scope="col" className="parent-detail-item__table-variant-header">
                    Variant
                  </th>
                ) : null}
                <th scope="col" className="parent-detail-item__table-title-header">
                  SKU Name
                </th>
                <th scope="col" className="parent-detail-item__table-uom-header">
                  Uom
                </th>
                {hwdFieldLabels.map((fieldLabel) => (
                  <th key={fieldLabel} scope="col" className="parent-detail-item__table-hwd-header">
                    {fieldLabel} (cm)
                  </th>
                ))}
                <th scope="col" className="parent-detail-item__table-leadtime-header">
                  Lead Time (Day)
                </th>
                {!isMatrixMode ? (
                  <th scope="col" className="parent-detail-item__table-action-header">
                    Action
                  </th>
                ) : null}
              </tr>
            </thead>

            <tbody>
              {detailItems.map((item, index) => {
                const isDuplicateRow = duplicateDetailItemIds.has(item.id)
                const isSyncedFollowerRow = syncAllDimensions && index > 0
                const isRowCreateEnabled = isRowEnabled(item)

                return (
                  <tr
                    key={item.id}
                    className={[
                      isDuplicateRow ? 'parent-detail-item__row--duplicate' : '',
                      isMatrixMode && !isRowCreateEnabled ? 'item-create-popup__matrix-row--muted' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined}
                  >
                    {isMatrixMode ? (
                      <td className="parent-detail-item__table-create-cell">
                        <input
                          type="checkbox"
                          className="register-user-popup__dropdown-checkbox"
                          checked={isRowCreateEnabled}
                          disabled={disabled}
                          onChange={() => handleRowCreateToggle(item.id)}
                          aria-label={`Create ${buildDetailItemTitle(itemName, item.item_variant, index)}`}
                        />
                      </td>
                    ) : null}

                    {isMatrixMode ? (
                      <td className="parent-detail-item__table-variant-cell">
                        <span className="parent-detail-item__row-variant">
                          {normalizeDetailItemText(item.item_variant) || '-'}
                        </span>
                      </td>
                    ) : null}

                    <td className="parent-detail-item__table-title-cell">
                      <span className="parent-detail-item__row-index">{index + 1}</span>
                      <div className="parent-detail-item__row-title-group">
                        <input
                          type="text"
                          className="register-user-popup__input register-user-popup__input--readonly parent-detail-item__row-title-input"
                          value={buildDetailItemTitle(itemName, item.item_variant, index)}
                          readOnly
                          disabled={disabled}
                          aria-label={`SKU Name ${index + 1}`}
                        />
                        {isDuplicateRow ? (
                          <p className="parent-detail-item__row-duplicate-note" role="alert">
                            Duplicate variant
                          </p>
                        ) : null}
                      </div>
                    </td>

                    <td
                      className={`parent-detail-item__field--uom${
                        isSyncedFollowerRow ? ' parent-detail-item__field--synced' : ''
                      }`}
                    >
                      {DetailSearchableSelect ? (
                        <DetailSearchableSelect
                          id={`parent-detail-uom-${item.id}`}
                          label="Uom"
                          value={item.uom_id}
                          options={uomOptions}
                          placeholder="Select UOM"
                          searchPlaceholder="Search UOM..."
                          emptyMessage="UOM not found."
                          loading={loadingUoms}
                          disabled={disabled || loadingUoms || isSyncedFollowerRow}
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
                          disabled={disabled || loadingUoms || isSyncedFollowerRow}
                        >
                          <option value="">
                            {loadingUoms ? 'Loading UOM...' : 'Select UOM'}
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
                        className={`parent-detail-item__field--hwd${
                          isSyncedFollowerRow ? ' parent-detail-item__field--synced' : ''
                        }`}
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
                          disabled={disabled || isSyncedFollowerRow}
                        />
                      </td>
                    ))}

                    <td
                      className={`parent-detail-item__field--lead-time${
                        isSyncedFollowerRow ? ' parent-detail-item__field--synced' : ''
                      }`}
                    >
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
                        disabled={disabled || isSyncedFollowerRow}
                      />
                    </td>

                    {!isMatrixMode ? (
                      <td className="parent-detail-item__table-action-cell">
                        <button
                          type="button"
                          className="users-table__icon-button users-table__icon-button--danger parent-detail-item__remove"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={disabled || detailItems.length <= 1}
                          title="Delete SKU"
                          aria-label={`Delete SKU ${index + 1}`}
                        >
                          <Trash03 size={16} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default CreateDetailItem
