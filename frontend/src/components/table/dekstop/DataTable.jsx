import { isValidElement, useEffect, useMemo, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import { Dialog, DialogContent } from '@mui/material'

import CreateButton from '../../button/CreateButton.jsx'
import { ChevronDown, ChevronLeft, ChevronRight } from '../../template/TemplateIcons.jsx'

const MIN_COLUMN_WIDTH = 64
const ESTIMATED_ROW_HEIGHT = 72
const MOBILE_LAYOUT_BREAKPOINT = 1024

function useIsMobileLayout(breakpoint = MOBILE_LAYOUT_BREAKPOINT) {
  const getMatches = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width: ${breakpoint}px)`).matches
      : false

  const [isMobile, setIsMobile] = useState(getMatches)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handleChange = (event) => setIsMobile(event.matches)

    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [breakpoint])

  return isMobile
}

function isActionLikeColumn(column) {
  if (column.key === 'action' || column.key === '__actions') {
    return true
  }

  return /action/i.test(column.headerClassName ?? '') || /action/i.test(column.cellClassName ?? '')
}

function getInitials(value = '') {
  return String(value)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getDefaultRowId(row, index) {
  return row?.id ?? row?.userId ?? row?.key ?? index
}

function normalizeList(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => String(item).trim()).filter(Boolean)
}

function resolveTemplateValue(value, row, index) {
  return typeof value === 'function' ? value(row, index) : value
}

function normalizePageSizeOptions(options, pageSize) {
  const normalizedOptions = (Array.isArray(options) ? options : [])
    .map((option) => Number(option))
    .filter((option) => Number.isInteger(option) && option > 0)
  const normalizedPageSize = Number(pageSize)

  if (
    Number.isInteger(normalizedPageSize) &&
    normalizedPageSize > 0 &&
    !normalizedOptions.includes(normalizedPageSize)
  ) {
    return [normalizedPageSize, ...normalizedOptions]
  }

  return normalizedOptions
}

function getColumnValue(column, row, index) {
  if (typeof column.render === 'function') {
    return column.render(row, index)
  }

  if (typeof column.accessor === 'function') {
    return column.accessor(row, index)
  }

  if (typeof column.accessor === 'string') {
    return row?.[column.accessor]
  }

  if (column.key) {
    return row?.[column.key]
  }

  return null
}

function renderBasicValue(value) {
  if (isValidElement(value)) {
    return value
  }

  if (Array.isArray(value)) {
    return <DataTableChips items={value} />
  }

  if (value === null) {
    return <span className="users-table__detail-value users-table__detail-value--muted">null</span>
  }

  if (value === undefined || value === '') {
    return <span className="users-table__detail-value users-table__detail-value--muted">-</span>
  }

  return value
}

function renderDetailValue(value) {
  if (isValidElement(value)) {
    return value
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="users-table__detail-value users-table__detail-value--mono">[]</span>
    }

    return (
      <div className="users-table__detail-chips">
        {value.map((item, index) => (
          <span className="users-table__detail-chip" key={`${item}-${index}`}>
            {item}
          </span>
        ))}
      </div>
    )
  }

  if (value === null) {
    return <span className="users-table__detail-value users-table__detail-value--muted">null</span>
  }

  if (value === undefined || value === '') {
    return <span className="users-table__detail-value users-table__detail-value--muted">-</span>
  }

  return (
    <span
      className={`users-table__detail-value${
        typeof value === 'number' ? ' users-table__detail-value--mono' : ''
      }`}
    >
      {String(value)}
    </span>
  )
}

function getDetailSections(detail, row, index) {
  if (!detail || !row) {
    return []
  }

  if (typeof detail.sections === 'function') {
    return detail.sections(row, index) ?? []
  }

  return detail.sections ?? []
}

function resolveColumnSizing(column) {
  const widthSource = column.headerStyle?.width ?? column.cellStyle?.width
  const minWidthSource = column.headerStyle?.minWidth ?? column.cellStyle?.minWidth
  const sizing = {}

  if (typeof widthSource === 'string' && widthSource.trim().endsWith('%')) {
    const percent = parseFloat(widthSource)

    if (Number.isFinite(percent) && percent > 0) {
      sizing.flex = percent / 100
    }
  } else if (widthSource !== undefined) {
    const pixelWidth = typeof widthSource === 'number' ? widthSource : parseFloat(widthSource)

    if (Number.isFinite(pixelWidth) && pixelWidth > 0) {
      sizing.width = pixelWidth
    }
  }

  if (minWidthSource !== undefined) {
    const pixelMinWidth = typeof minWidthSource === 'number' ? minWidthSource : parseFloat(minWidthSource)

    if (Number.isFinite(pixelMinWidth) && pixelMinWidth > 0) {
      sizing.minWidth = pixelMinWidth
    }
  } else if (!sizing.width) {
    sizing.minWidth = MIN_COLUMN_WIDTH
  }

  if (!sizing.width && !sizing.flex) {
    sizing.flex = 1
  }

  return sizing
}

function getRestCellStyle(cellStyle) {
  if (!cellStyle) {
    return undefined
  }

  const rest = { ...cellStyle }

  delete rest.width
  delete rest.minWidth

  return Object.keys(rest).length > 0 ? rest : undefined
}

export function DataTableStatus({
  children,
  variant = 'active',
  inline = false,
  className = '',
}) {
  const statusClassName = [
    'users-table__status',
    inline ? 'users-table__status--inline' : '',
    variant ? `users-table__status--${variant}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <span className={statusClassName}>{children ?? '-'}</span>
}

export function DataTableChips({ items = [], empty = '-', variant = 'app', className = '' }) {
  const normalizedItems = normalizeList(items)

  if (normalizedItems.length === 0) {
    return <span className="users-table__apps-empty">{empty}</span>
  }

  return (
    <div className={['users-table__apps', className].filter(Boolean).join(' ')}>
      {normalizedItems.map((item, index) => (
        <DataTableStatus key={`${item}-${index}`} variant={variant} inline>
          {item}
        </DataTableStatus>
      ))}
    </div>
  )
}

export function DataTableIdentity({ title, subtitle, initials, badge, className = '' }) {
  return (
    <div className={['users-table__identity', className].filter(Boolean).join(' ')}>
      <span className="users-table__avatar">{initials || getInitials(title)}</span>

      <div className="users-table__identity-copy">
        <div className="users-table__name-row">
          <strong className="users-table__name">{title}</strong>
          {badge}
        </div>

        {subtitle ? <div className="users-table__meta">{subtitle}</div> : null}
      </div>
    </div>
  )
}

function DataTable({
  rows = [],
  columns = [],
  getRowId = getDefaultRowId,
  detail = null,
  actions = [],
  pagination = null,
  tableLabel = 'Data table',
  tableMessage = '',
  emptyMessage,
  className = '',
  autoHeight = true,
  onRowClick,
  getRowClassName,
  wrapperClassName = 'users-table-wrapper',
  cellContentClassName = 'users-table__cell-content',
  emptyClassName = 'users-table__empty',
  detailDialogClassName = 'users-table__accordion-dialog',
  detailContentClassName = 'users-table__accordion',
  detailHeaderClassName = 'users-table__accordion-header',
  detailCopyClassName = 'users-table__accordion-copy',
  detailTitleClassName = 'users-table__accordion-title',
  detailShellClassName = 'users-table__detail-shell',
  actionHeaderClassName = 'users-table__action-header',
  actionGroupClassName = 'users-table__action-group',
}) {
  const [activeDetail, setActiveDetail] = useState(null)
  const isMobile = useIsMobileLayout()
  const hasDetail = Boolean(detail)
  const resolvedEmptyMessage = emptyMessage ?? tableMessage ?? 'Belum ada data.'
  const currentPageSize = Number(pagination?.pageSize)
  const hasPagination = Boolean(pagination) && Number.isInteger(currentPageSize) && currentPageSize > 0
  const pageSizeOptions = normalizePageSizeOptions(pagination?.pageSizeOptions, currentPageSize)

  const rowMeta = useMemo(() => {
    const idToIndex = new Map()
    const rowToId = new Map()

    rows.forEach((row, index) => {
      const rowId = getRowId(row, index)

      idToIndex.set(rowId, index)
      rowToId.set(row, rowId)
    })

    return { idToIndex, rowToId }
  }, [rows, getRowId])

  const closeDetail = () => setActiveDetail(null)
  const openDetail = (row, index) => setActiveDetail({ row, index })

  const cardColumnGroups = useMemo(() => {
    const primaryColumn =
      columns.find((column) => column.key === 'identity') ??
      columns.find((column) => !isActionLikeColumn(column)) ??
      null
    const bodyColumns = columns.filter(
      (column) => column !== primaryColumn && !isActionLikeColumn(column),
    )
    const inlineActionColumns = columns.filter(isActionLikeColumn)

    return { primaryColumn, bodyColumns, inlineActionColumns }
  }, [columns])

  const renderActionButtons = (row, index) => (
    <div className={actionGroupClassName}>
      {actions.map((action) => {
        if (action.hidden?.(row, index)) {
          return null
        }

        const Icon = action.icon
        const buttonLabel = action.label ?? action.key ?? 'Action'

        return (
          <CreateButton
            key={action.key ?? buttonLabel}
            variant="accordion"
            tone={action.variant === 'danger' ? 'danger' : 'default'}
            type="button"
            disabled={action.disabled?.(row, index) ?? action.disabled}
            aria-label={buttonLabel}
            title={buttonLabel}
            onClick={(event) => {
              event.stopPropagation()
              action.onClick?.(row, index, event)
            }}
          >
            {Icon ? <Icon size={16} aria-hidden="true" /> : buttonLabel}
          </CreateButton>
        )
      })}
    </div>
  )

  const renderDetailTrigger = (row, index) => (
    <CreateButton
      variant="detail"
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        openDetail(row, index)
      }}
      title="Buka detail"
    >
      {detail?.buttonLabel !== '' && detail?.buttonLabel !== null && detail?.buttonLabel !== undefined ? (
        <span>{detail.buttonLabel}</span>
      ) : null}
      <ChevronDown size={16} aria-hidden="true" />
    </CreateButton>
  )

  const gridColumns = useMemo(() => {
    const dataColumns = columns.map((column) => {
      const sizing = resolveColumnSizing(column)
      const restCellStyle = getRestCellStyle(column.cellStyle)
      const isStringHeader = typeof column.header === 'string'

      return {
        field: column.key,
        headerName: isStringHeader ? column.header : '',
        renderHeader: isStringHeader ? undefined : () => column.header,
        headerClassName: column.headerClassName,
        cellClassName: column.cellClassName,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        ...sizing,
        renderCell: (params) => {
          const index = rowMeta.idToIndex.get(params.id) ?? 0
          const value = renderBasicValue(getColumnValue(column, params.row, index))

          return (
            <div
              className={cellContentClassName}
              style={{ display: 'flex', alignItems: 'center', width: '100%', ...restCellStyle }}
            >
              {value}
            </div>
          )
        },
      }
    })

    if (actions.length > 0) {
      dataColumns.push({
        field: '__actions',
        headerName: 'Action',
        headerClassName: actionHeaderClassName,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        width: Math.max(96, actions.length * 44),
        renderCell: (params) => {
          const index = rowMeta.idToIndex.get(params.id) ?? 0

          return renderActionButtons(params.row, index)
        },
      })
    }

    if (hasDetail) {
      dataColumns.push({
        field: '__detail',
        headerName: detail.columnLabel ?? '',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        width: 110,
        renderCell: (params) => {
          const index = rowMeta.idToIndex.get(params.id) ?? 0

          return renderDetailTrigger(params.row, index)
        },
      })
    }

    return dataColumns
  }, [
    columns,
    actions,
    hasDetail,
    detail,
    rowMeta,
    cellContentClassName,
    actionHeaderClassName,
    renderActionButtons,
    renderDetailTrigger,
  ])

  const handleRowActivate = (row, index) => {
    onRowClick?.(row, index)

    if (hasDetail) {
      openDetail(row, index)
    }
  }

  const handlePaginationModelChange = (model) => {
    if (!pagination) {
      return
    }

    if (model.pageSize !== currentPageSize) {
      pagination.onPageSizeChange?.(model.pageSize)
      return
    }

    if (model.page + 1 !== pagination.currentPage) {
      pagination.onSelect?.(model.page + 1)
    }
  }

  const detailRow = activeDetail?.row ?? null
  const detailIndex = activeDetail?.index ?? 0
  const detailSections = detailRow ? getDetailSections(detail, detailRow, detailIndex) : []
  const detailTitle = detailRow ? resolveTemplateValue(detail.title, detailRow, detailIndex) : null
  const detailDescription = detailRow ? resolveTemplateValue(detail.description, detailRow, detailIndex) : null
  const detailEyebrow = detailRow ? resolveTemplateValue(detail.eyebrow, detailRow, detailIndex) : null

  const paginationProps = hasPagination
    ? {
        paginationMode: 'server',
        paginationModel: {
          page: Math.max(0, (Number(pagination.currentPage) || 1) - 1),
          pageSize: currentPageSize,
        },
        onPaginationModelChange: handlePaginationModelChange,
        pageSizeOptions: pageSizeOptions.length > 0 ? pageSizeOptions : [currentPageSize],
        rowCount: Math.max(0, Number(pagination.totalPages) || 1) * currentPageSize,
      }
    : {}

  const renderCardList = () => {
    const { primaryColumn, bodyColumns, inlineActionColumns } = cardColumnGroups
    const hasFooter = inlineActionColumns.length > 0 || actions.length > 0 || hasDetail

    return (
    <div className="users-table-cards">
      {rows.map((row, index) => {
        const rowId = rowMeta.rowToId.get(row)
        const isInteractive = Boolean(onRowClick || hasDetail)
        const rowExtraClassName = getRowClassName?.(row, index) ?? ''
        const activateRow = () => handleRowActivate(row, index)

        return (
          <div
            key={rowId}
            className={['users-table-cards__item', isInteractive ? 'users-table-cards__item--interactive' : '', rowExtraClassName]
              .filter(Boolean)
              .join(' ')}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onClick={isInteractive ? activateRow : undefined}
            onKeyDown={
              isInteractive
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      activateRow()
                    }
                  }
                : undefined
            }
          >
            {primaryColumn ? (
              <div className="users-table-cards__primary">
                {renderBasicValue(getColumnValue(primaryColumn, row, index))}
              </div>
            ) : null}

            {bodyColumns.length > 0 ? (
              <dl className="users-table__detail-list users-table-cards__list">
                {bodyColumns.map((column) => (
                  <div className="users-table__detail-row" key={column.key}>
                    <dt className="users-table__detail-label">
                      {typeof column.header === 'string' ? column.header : ''}
                    </dt>
                    <dd className="users-table__detail-field">
                      {renderDetailValue(getColumnValue(column, row, index))}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {hasFooter ? (
              <div className="users-table-cards__footer">
                {inlineActionColumns.length > 0 ? (
                  <div className="users-table-cards__inline-actions">
                    {inlineActionColumns.map((column) => (
                      <div key={column.key}>{renderBasicValue(getColumnValue(column, row, index))}</div>
                    ))}
                  </div>
                ) : null}

                {actions.length > 0 || hasDetail ? (
                  <div className="users-table-cards__footer-actions">
                    {actions.length > 0 ? renderActionButtons(row, index) : null}
                    {hasDetail ? renderDetailTrigger(row, index) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
    )
  }

  const renderCardPagination = () => {
    if (!hasPagination) {
      return null
    }

    const safeCurrentPage = Math.max(1, Number(pagination.currentPage) || 1)
    const safeTotalPages = Math.max(1, Number(pagination.totalPages) || 1)

    return (
      <div className="users-table-cards__pagination">
        <div className="users-table-cards__pagination-nav">
          <button
            type="button"
            className="users-table-cards__pagination-button"
            disabled={safeCurrentPage <= 1}
            onClick={() => pagination.onSelect?.(Math.max(1, safeCurrentPage - 1))}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>

          <span className="users-table-cards__pagination-label">
            Halaman {safeCurrentPage} dari {safeTotalPages}
          </span>

          <button
            type="button"
            className="users-table-cards__pagination-button"
            disabled={safeCurrentPage >= safeTotalPages}
            onClick={() => pagination.onSelect?.(Math.min(safeTotalPages, safeCurrentPage + 1))}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        {pageSizeOptions.length > 1 ? (
          <label className="users-table-cards__pagination-size">
            Tampilkan
            <select
              className="users-table-cards__pagination-select"
              value={currentPageSize}
              onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <div
        className={[wrapperClassName, isMobile ? 'users-table-wrapper--cards' : '', className]
          .filter(Boolean)
          .join(' ')}
      >
        {isMobile ? (
          rows.length > 0 ? (
            renderCardList()
          ) : (
            <div className={emptyClassName}>{resolvedEmptyMessage}</div>
          )
        ) : (
        <DataGrid
          aria-label={tableLabel}
          rows={rows}
          columns={gridColumns}
          getRowId={(row) => rowMeta.rowToId.get(row)}
          getRowHeight={() => 'auto'}
          getEstimatedRowHeight={() => ESTIMATED_ROW_HEIGHT}
          autoHeight={autoHeight}
          disableColumnMenu
          disableRowSelectionOnClick
          onRowClick={(params) => handleRowActivate(params.row, rowMeta.idToIndex.get(params.id) ?? 0)}
          getRowClassName={(params) =>
            getRowClassName?.(params.row, rowMeta.idToIndex.get(params.id) ?? 0) ?? ''
          }
          slots={{
            noRowsOverlay: () => (
              <div className={emptyClassName} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {resolvedEmptyMessage}
              </div>
            ),
          }}
          sx={{
            border: 'none',
            borderRadius: 12,
            // MUI DataGrid rounds the header's first/last cell corners off this token
            // (see GridRootStyles's `--unstable_DataGrid-radius` usage), independently of
            // any borderRadius set here — leaving it at its default caused a visible seam
            // between the header cell's own corner and the wrapper's rounded clip.
            '--unstable_DataGrid-radius': '12px',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            color: 'inherit',
            overflow: 'hidden',
            '& .MuiDataGrid-main': {
              borderRadius: 12,
            },
            '& .MuiDataGrid-cell': {
              paddingTop: '0.4rem',
              paddingBottom: '0.4rem',
              fontFamily: 'inherit',
            },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
              outline: 'none',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f8fafc',
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: '#f8fafc',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontFamily: 'inherit',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid rgba(26, 42, 87, 0.08)',
            },
          }}
          {...paginationProps}
        />
        )}
      </div>

      {isMobile ? renderCardPagination() : null}

      {hasDetail ? (
        <Dialog
          open={Boolean(activeDetail)}
          onClose={closeDetail}
          maxWidth="md"
          fullWidth
          slotProps={{
            paper: { className: [detailDialogClassName, className].filter(Boolean).join(' ') },
          }}
        >
          <DialogContent className={detailContentClassName}>
            <div className={detailHeaderClassName}>
              <div className={detailCopyClassName}>
                <p className="users-table__accordion-eyebrow">{detailEyebrow ?? 'Detail'}</p>
                <h3 className={detailTitleClassName}>
                  {detailTitle ?? detailRow?.name ?? detailRow?.title ?? (detailRow ? getRowId(detailRow, detailIndex) : '')}
                </h3>
                {detailDescription ? (
                  <p className="users-table__accordion-description">{detailDescription}</p>
                ) : null}
              </div>
            </div>

            {detailRow && typeof detail.render === 'function' ? detail.render(detailRow, detailIndex) : null}

            {detailSections.length > 0 ? (
              <div className={detailShellClassName}>
                {detailSections.map((section) => (
                  <section
                    key={section.title}
                    className={`users-table__detail-section${
                      section.wide ? ' users-table__detail-section--wide' : ''
                    }`}
                  >
                    <div className="users-table__detail-section-header">
                      <p className="users-table__detail-section-eyebrow">{section.title}</p>
                    </div>

                    <dl className="users-table__detail-list">
                      {(section.fields ?? []).map((field) => {
                        const fieldValue =
                          typeof field.render === 'function'
                            ? field.render(detailRow, detailIndex)
                            : resolveTemplateValue(field.value, detailRow, detailIndex)

                        return (
                          <div
                            key={field.label}
                            className={`users-table__detail-row${
                              field.kind === 'chips' ? ' users-table__detail-row--stacked' : ''
                            }`}
                          >
                            <dt className="users-table__detail-label">{field.label}</dt>
                            <dd className="users-table__detail-field">{renderDetailValue(fieldValue)}</dd>
                          </div>
                        )
                      })}
                    </dl>
                  </section>
                ))}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}

export default DataTable
