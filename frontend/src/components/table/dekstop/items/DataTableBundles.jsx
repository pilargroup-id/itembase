import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import FormControl from "@mui/material/FormControl"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"

import api from "../../../../services/api.js"

import DialogEditBundle from "../../../Dialog/dialog-bundles/DialogEditBundle.jsx"
import DialogFilterBundle from "../../../Dialog/dialog-bundles/DialogFilterBundle.jsx"
import DialogImportBundle from "../../../Dialog/dialog-bundles/DialogImportBundle.jsx"
import ButtonCreateBundle from "../../../button/bundles-buttons/ButtonCreateBundle.jsx"
import ButtonDownloadBundle from "../../../button/bundles-buttons/ButtonDownloadBundle.jsx"
import ButtonEditBundle from "../../../button/bundles-buttons/ButtonEditBundle.jsx"
import ButtonExportBundle from "../../../button/bundles-buttons/ButtonExportBundle.jsx"
import ButtonImportBundle from "../../../button/bundles-buttons/ButtonImportBundle.jsx"
import SearchBundle from "../../../search/SearchBundle.jsx"
import { Export01, FilterFunnel, XClose } from "../../../template/TemplateIcons.jsx"
import { itemFilterConfig } from "../../../dropdown/filter-bundles/FilterDropdownBundles.config.js"
import DataTable, {
    DataTableIdentity,
} from "../DataTable.jsx"
import {
    DEFAULT_PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
    getPaginationItems,
} from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_BUNDLE_SORT = "date-desc"
const SORT_FILTER_KEY = "sort"
const bundleSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
]
const bundleFilterMenuProps = {
    PaperProps: {
        className: "parent-table-mui-menu",
        sx: {
            maxHeight: 320,
            borderRadius: "10px",
            mt: 0.5,
        },
    },
}
const itemTableSelectMenuProps = {
    PaperProps: {
        className: "parent-table-mui-menu item-table__mui-menu",
        sx: {
            maxHeight: 280,
            borderRadius: "10px",
            mt: 0.5,
        },
    },
}
const itemStatusOptions = [
    { value: "ACTIVE", label: "Active", variant: "active" },
    { value: "INACTIVE", label: "Inactive", variant: "inactive" },
    { value: "DISCONTINUE", label: "Discontinue", variant: "discontinue" },
]
const itemStatusOptionMap = new Map(itemStatusOptions.map((option) => [option.value, option]))
const bundleFilterConfig = itemFilterConfig.filter((filterConfig) => filterConfig.key !== "itemKind")

const defaultBundleFilters = bundleFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)
const bundleFilterFieldOptions = [
    { key: SORT_FILTER_KEY, label: "Sort By" },
    ...bundleFilterConfig,
]

function getItemId(item) {
    return item?.id ?? item?.item_id ?? null
}

function getItemDisplayName(item) {
    return item?.item_name || item?.item_code || item?.barcode || "bundle ini"
}

function normalizeItemStatus(value) {
    const normalizedStatus = String(value ?? "").trim().toUpperCase()

    if (normalizedStatus === "ACTIVE" || normalizedStatus === "INACTIVE" || normalizedStatus === "DISCONTINUE") {
        return normalizedStatus
    }

    if (normalizedStatus === "DISCONTINUED") {
        return "DISCONTINUE"
    }

    if (normalizedStatus === "1") {
        return "ACTIVE"
    }

    if (normalizedStatus === "0") {
        return "INACTIVE"
    }

    return ""
}

function getItemStatusValue(item) {
    const statusValue = normalizeItemStatus(item?.status)

    if (statusValue) {
        return statusValue
    }

    if (item?.is_active !== undefined && item?.is_active !== null) {
        return Number(item.is_active) === 1 ? "ACTIVE" : "INACTIVE"
    }

    return ""
}

function getItemStatusLabel(item) {
    const statusValue = getItemStatusValue(item)

    return itemStatusOptionMap.get(statusValue)?.label ?? "-"
}

function getItemStatusVariant(item) {
    const statusValue = getItemStatusValue(item)

    return itemStatusOptionMap.get(statusValue)?.variant ?? "pending"
}

function getOptionLabel(optionMap, value, fallback = "-") {
    return optionMap.get(value)?.label ?? fallback
}

function getResponseItem(responseData) {
    const candidates = [
        responseData?.data?.data,
        responseData?.data,
        responseData,
    ]

    return candidates.find((candidate) =>
        candidate && typeof candidate === "object" && !Array.isArray(candidate) && getItemId(candidate),
    ) ?? null
}

function formatDisplayValue(value) {
    const displayValue = String(value ?? "").trim()

    return displayValue || "-"
}

function renderItemValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function formatNumberValue(value) {
    const numericValue = Number(value)

    if (Number.isNaN(numericValue)) {
        return formatDisplayValue(value)
    }

    return new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 2,
    }).format(numericValue)
}

function normalizeItemRows(responseData) {
    if (Array.isArray(responseData)) {
        return responseData
    }

    if (Array.isArray(responseData?.data)) {
        return responseData.data
    }

    if (Array.isArray(responseData?.data?.data)) {
        return responseData.data.data
    }

    if (Array.isArray(responseData?.data?.rows)) {
        return responseData.data.rows
    }

    if (Array.isArray(responseData?.data?.results)) {
        return responseData.data.results
    }

    if (Array.isArray(responseData?.rows)) {
        return responseData.rows
    }

    if (Array.isArray(responseData?.results)) {
        return responseData.results
    }

    return []
}

function getPaginationMeta(responseData, rows) {
    const meta = responseData?.meta ?? responseData?.data?.meta ?? {}
    const page = Number(meta.page ?? meta.current_page ?? 1)
    const limit = Number(meta.limit ?? meta.per_page ?? rows.length)
    const total = Number(meta.total ?? meta.total_data ?? rows.length)
    const totalPages = Number(
        meta.totalPages ?? meta.total_page ?? meta.totalPage ?? meta.total_pages ?? meta.last_page,
    )
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : rows.length || 1
    const safeTotal = Number.isInteger(total) && total >= 0 ? total : rows.length

    return {
        page: Number.isInteger(page) && page > 0 ? page : 1,
        limit: safeLimit,
        total: safeTotal,
        totalPages: Number.isInteger(totalPages) && totalPages > 0
            ? totalPages
            : Math.max(1, Math.ceil(safeTotal / safeLimit)),
    }
}

function normalizeFilterValue(value) {
    return String(value ?? "").trim()
}

function normalizeFilterOption(option, fallbackValue = "") {
    if (typeof option === "object" && option !== null) {
        const value = normalizeFilterValue(option.value)

        if (!value) {
            return null
        }

        const label = normalizeFilterValue(option.label) || value

        return {
            value,
            label,
            searchText: [label, value, option.searchText].filter(Boolean).join(" "),
        }
    }

    const value = normalizeFilterValue(option ?? fallbackValue)

    if (!value) {
        return null
    }

    return {
        value,
        label: value,
        searchText: value,
    }
}

function createFilterOptions(rows, filterConfig) {
    if (Array.isArray(filterConfig.options)) {
        return [
            { value: ALL_FILTER_VALUE, label: filterConfig.placeholder },
            ...filterConfig.options,
        ]
    }

    const optionMap = new Map()

    rows.forEach((item) => {
        const option = normalizeFilterOption(
            filterConfig.getOption?.(item) ?? filterConfig.getValue(item),
            filterConfig.getValue(item),
        )

        if (!option || option.value === ALL_FILTER_VALUE || optionMap.has(option.value)) {
            return
        }

        optionMap.set(option.value, option)
    })

    return [
        { value: ALL_FILTER_VALUE, label: filterConfig.placeholder },
        ...Array.from(optionMap.values()).sort((firstOption, secondOption) =>
            firstOption.label.localeCompare(secondOption.label),
        ),
    ]
}

function createItemApiParams(filters, searchQuery) {
    const params = {
        item_kind: "bundle",
    }

    bundleFilterConfig.forEach((filterConfig) => {
        // skip item_kind filter since we always force bundle
        if (filterConfig.apiParam === "item_kind") {
            return
        }

        const selectedValue = normalizeFilterValue(filters[filterConfig.key])

        if (!filterConfig.apiParam || !selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return
        }

        params[filterConfig.apiParam] = selectedValue
    })

    const normalizedSearchQuery = normalizeFilterValue(searchQuery)

    if (normalizedSearchQuery) {
        params.search = normalizedSearchQuery
    }

    return params
}

function createPaginatedItemApiParams({
    filters,
    searchQuery,
    currentPage,
    pageSize,
    sortValue,
}) {
    return {
        ...createItemApiParams(filters, searchQuery),
        page: currentPage,
        limit: pageSize,
        sort: sortValue,
    }
}

function getServerPageSummary(rowCount, currentPage, pageSize, totalItems) {
    const currentPageStart = (currentPage - 1) * pageSize
    const firstItem = totalItems === 0 || rowCount === 0 ? 0 : currentPageStart + 1
    const lastItem =
        totalItems === 0 || rowCount === 0
            ? 0
            : Math.min(currentPageStart + rowCount, totalItems)

    return { firstItem, lastItem }
}

function getPaginationSummary(firstItem, lastItem, totalItems) {
    if (totalItems === 0) {
        return "0 dari 0 data"
    }

    return `${firstItem}-${lastItem} dari ${totalItems} data`
}

function useDebouncedValue(value, delay = 350) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => window.clearTimeout(timeoutId)
    }, [delay, value])

    return debouncedValue
}

function ItemTableSelect({
    id,
    type,
    variant,
    value,
    options,
    ariaLabel,
    title,
    disabled = false,
    onChange,
}) {
    return (
        <div
            className={[
                "item-table__select-wrap",
                type ? `item-table__select-wrap--${type}` : "",
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={(event) => event.stopPropagation()}
        >
            <FormControl
                size="small"
                className={[
                    "parent-table-mui-filter",
                    "item-table__mui-select",
                    type ? `item-table__mui-select--${type}` : "",
                    variant ? `item-table__mui-select--${variant}` : "",
                    disabled ? "item-table__mui-select--disabled" : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                <Select
                    id={id}
                    value={value}
                    aria-label={ariaLabel}
                    title={title}
                    disabled={disabled}
                    displayEmpty
                    MenuProps={itemTableSelectMenuProps}
                    onMouseDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(event) => onChange?.(event.target.value)}
                >
                    {options.map((option) => (
                        <MenuItem
                            key={option.value || "empty"}
                            value={option.value}
                            dense
                            disabled={option.disabled}
                        >
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </div>
    )
}

function DialogValidateInlineBundleStatus({
    change = null,
    isSubmitting = false,
    onClose,
    onConfirm,
}) {
    useEffect(() => {
        if (!change) {
            return undefined
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !isSubmitting) {
                onClose?.()
            }
        }

        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [change, isSubmitting, onClose])

    if (!change || typeof document === "undefined") {
        return null
    }

    const dialogNode = (
        <div
            className="dashboard-popup-overlay"
            role="presentation"
            onClick={() => {
                if (!isSubmitting) {
                    onClose?.()
                }
            }}
        >
            <div
                className="dashboard-popup item-table-validation-popup"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-inline-bundle-status-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="dashboard-popup__header">
                    <div>
                        <p className="dashboard-popup__eyebrow">Validasi Perubahan Bundle</p>
                        <h2 className="dashboard-popup__title" id="dialog-inline-bundle-status-title">
                            Konfirmasi Perubahan Status
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="dashboard-popup__close"
                        aria-label="Close dialog"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        <XClose size={18} />
                    </button>
                </div>

                <div className="dashboard-popup__body">
                    <p className="dashboard-popup__text">
                        Ubah <strong>{change.itemName}</strong> dari{" "}
                        <strong>{change.previousLabel}</strong> ke <strong>{change.nextLabel}</strong>?
                    </p>
                    <p className="dashboard-popup__text">
                        Status bundle akan diperbarui menggunakan enum item terbaru.
                    </p>
                </div>

                <div className="dashboard-popup__actions">
                    <button
                        type="button"
                        className="dashboard-popup__button dashboard-popup__button--secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="dashboard-popup__button dashboard-popup__button--primary"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Saving..." : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(dialogNode, document.body)
}

const columns = [
    {
        key: "identity",
        header: "SKU BUNDLING NAME / CODE",
        headerStyle: { width: "14%", minWidth: 220 },
        cellStyle: { width: "14%", minWidth: 220 },
        render: (item) => (
            <DataTableIdentity
                title={item.item_name || "-"}
                subtitle={item.item_code || "-"}
            />
        ),
    },
    {
        key: "sellingName",
        header: "Selling Name",
        headerStyle: { width: "12%", minWidth: 220 },
        cellStyle: { width: "12%", minWidth: 220 },
        render: (item) => (
            <DataTableIdentity title={item.selling_name ?? item.item_name ?? "-"} />
        ),
    },
    {
        key: "barcode",
        header: "Barcode",
        headerStyle: { width: "8%", minWidth: 130 },
        cellStyle: { width: "8%", minWidth: 130 },
        render: (item) => renderItemValue(item.barcode),
    },
    {
        key: "parent",
        header: "Parent Name",
        headerStyle: { width: "13%", minWidth: 190 },
        cellStyle: { width: "13%", minWidth: 190 },
        render: (item) => (
            <DataTableIdentity
                title={item.parent?.parent_name || "-"}
                subtitle={item.parent?.parent_code || "-"}
            />
        ),
    },
    {
        key: "brand",
        header: "Brand",
        headerStyle: { width: "6%", minWidth: 120 },
        cellStyle: { width: "6%", minWidth: 120 },
        render: (item) => renderItemValue(item.parent?.brand?.name),
    },
    {
        key: "category",
        header: "Category",
        headerStyle: { width: "8%", minWidth: 150 },
        cellStyle: { width: "8%", minWidth: 150 },
        render: (item) => renderItemValue(item.parent?.category?.detail_category),
    },
    {
        key: "uom",
        header: "UOM",
        headerStyle: { width: "5%", minWidth: 96 },
        cellStyle: { width: "5%", minWidth: 96 },
        render: (item) => renderItemValue(item.uom?.code ?? item.uom?.name),
    },
    {
        key: "pack",
        header: "Pack",
        headerStyle: { width: "5%", minWidth: 96 },
        cellStyle: { width: "5%", minWidth: 96 },
        render: (item) => renderItemValue(formatNumberValue(item.qty_per_pack)),
    },
    {
        key: "components",
        header: "Components",
        headerStyle: { width: "7%", minWidth: 120 },
        cellStyle: { width: "7%", minWidth: 120 },
        render: (item) => renderItemValue(
            Array.isArray(item.components) ? item.components.length : "-"
        ),
    },
]

function DataTableBundles({
    searchQuery = "",
    onSearchQueryChange,
    tableLabel = "Bundles table",
    refreshKey = 0,
}) {
    const [filters, setFilters] = useState(defaultBundleFilters)
    const [selectedFilterKeys, setSelectedFilterKeys] = useState([])
    const [sortValue, setSortValue] = useState(DEFAULT_BUNDLE_SORT)
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
    const [itemRows, setItemRows] = useState([])
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [importPreviewResponse, setImportPreviewResponse] = useState(null)
    const [importFileName, setImportFileName] = useState("")
    const [importErrorMessage, setImportErrorMessage] = useState("")
    const [isImportPreviewing, setIsImportPreviewing] = useState(false)
    const [importDialogKey, setImportDialogKey] = useState(0)
    const [reloadKey, setReloadKey] = useState(0)
    const [pendingStatusUpdates, setPendingStatusUpdates] = useState({})
    const [pendingInlineChange, setPendingInlineChange] = useState(null)
    const [isInlineValidationSubmitting, setIsInlineValidationSubmitting] = useState(false)
    const [inlineUpdateErrorMessage, setInlineUpdateErrorMessage] = useState("")
    const debouncedSearchQuery = useDebouncedValue(searchQuery)
    const filterResetKey = useMemo(
        () => JSON.stringify({ filters, pageSize, searchQuery: debouncedSearchQuery, sortValue }),
        [debouncedSearchQuery, filters, pageSize, sortValue],
    )
    const [paginationState, setPaginationState] = useState({
        currentPage: 1,
        resetKey: filterResetKey,
    })
    const currentPage =
        paginationState.resetKey === filterResetKey ? paginationState.currentPage : 1

    const filterOptions = useMemo(
        () =>
            bundleFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(itemRows, filterConfig),
                }),
                {},
            ),
        [itemRows],
    )
    const selectedFilterConfigs = useMemo(
        () =>
            selectedFilterKeys
                .map((filterKey) => bundleFilterConfig.find((filterConfig) => filterConfig.key === filterKey))
                .filter(Boolean),
        [selectedFilterKeys],
    )
    const hasSelectedSortFilter = selectedFilterKeys.includes(SORT_FILTER_KEY)

    const itemApiParams = useMemo(
        () =>
            createPaginatedItemApiParams({
                filters,
                searchQuery: debouncedSearchQuery,
                currentPage,
                pageSize,
                sortValue,
            }),
        [currentPage, debouncedSearchQuery, filters, pageSize, sortValue],
    )
    const safeCurrentPage = Math.min(currentPage, totalPages)
    const rows = itemRows
    const { firstItem, lastItem } = useMemo(
        () => getServerPageSummary(rows.length, safeCurrentPage, pageSize, totalItems),
        [pageSize, rows.length, safeCurrentPage, totalItems],
    )

    const selectedItemName =
        selectedItem?.item_name || selectedItem?.item_code || selectedItem?.barcode || "bundle ini"

    useEffect(() => {
        let isMounted = true
        const controller = new AbortController()

        const loadItems = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.items.list(itemApiParams, { signal: controller.signal })
                const itemRows = normalizeItemRows(response)
                const meta = getPaginationMeta(response, itemRows)

                if (!isMounted) {
                    return
                }

                setItemRows(itemRows)
                setTotalItems(meta.total)
                setTotalPages(meta.totalPages)

                if (meta.page > meta.totalPages) {
                    setPaginationState({
                        currentPage: meta.totalPages,
                        resetKey: filterResetKey,
                    })
                }
            } catch (error) {
                if (!isMounted || error?.name === "AbortError") {
                    return
                }

                setItemRows([])
                setTotalItems(0)
                setTotalPages(1)
                setErrorMessage(error?.message || "Gagal memuat data bundle.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadItems()

        return () => {
            isMounted = false
            controller.abort()
        }
    }, [filterResetKey, itemApiParams, refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedItem(null)
    }

    const closeImportDialog = () => {
        setActiveActionDialog(null)
        setImportPreviewResponse(null)
        setImportFileName("")
        setImportErrorMessage("")
        setIsImportPreviewing(false)
    }

    const openActionDialog = (dialogType, item) => {
        setSelectedItem(item)
        setActiveActionDialog(dialogType)
    }

    const openImportDialog = () => {
        setImportDialogKey((currentKey) => currentKey + 1)
        setImportFileName("")
        setImportPreviewResponse(null)
        setImportErrorMessage("")
        setIsImportPreviewing(false)
        setActiveActionDialog("import")
    }

    const updateItemRow = (changedItem, nextValues) => {
        const itemId = getItemId(changedItem)

        setItemRows((currentRows) =>
            currentRows.map((row) =>
                getItemId(row) === itemId
                    ? { ...row, ...nextValues }
                    : row,
            ),
        )
    }

    const updateItemRowStatus = (changedItem, newStatus) => {
        updateItemRow(changedItem, {
            status: newStatus,
            is_active: newStatus === "ACTIVE" ? 1 : 0,
        })
    }

    const handleStatusChange = async (item, nextStatusValue) => {
        const itemId = getItemId(item)
        const previousStatus = getItemStatusValue(item)
        const nextStatus = normalizeItemStatus(nextStatusValue)

        if (!itemId || !nextStatus || nextStatus === previousStatus) {
            return false
        }

        setInlineUpdateErrorMessage("")
        setPendingStatusUpdates((currentUpdates) => ({
            ...currentUpdates,
            [itemId]: true,
        }))
        updateItemRowStatus(item, nextStatus)

        try {
            const response = await api.items.updateStatus(itemId, nextStatus)
            const updatedItem = getResponseItem(response)

            if (updatedItem) {
                updateItemRow(item, updatedItem)
            }

            return true
        } catch (error) {
            updateItemRowStatus(item, previousStatus)
            setInlineUpdateErrorMessage(error?.message || "Gagal mengubah status bundle.")
            return false
        } finally {
            setPendingStatusUpdates((currentUpdates) => {
                const nextUpdates = { ...currentUpdates }

                delete nextUpdates[itemId]

                return nextUpdates
            })
        }
    }

    const requestStatusChange = (item, nextStatusValue) => {
        const itemId = getItemId(item)
        const previousStatus = getItemStatusValue(item)
        const nextStatus = normalizeItemStatus(nextStatusValue)

        if (!itemId) {
            setInlineUpdateErrorMessage("Item ID tidak ditemukan.")
            return
        }

        if (!itemStatusOptionMap.has(nextStatus)) {
            setInlineUpdateErrorMessage("Status bundle tidak valid.")
            return
        }

        if (nextStatus === previousStatus) {
            return
        }

        setInlineUpdateErrorMessage("")
        setPendingInlineChange({
            item,
            nextValue: nextStatus,
            previousLabel: getOptionLabel(itemStatusOptionMap, previousStatus),
            nextLabel: getOptionLabel(itemStatusOptionMap, nextStatus),
            itemName: getItemDisplayName(item),
        })
    }

    const closeInlineValidationDialog = () => {
        if (isInlineValidationSubmitting) {
            return
        }

        setPendingInlineChange(null)
    }

    const confirmInlineValidationChange = async () => {
        if (!pendingInlineChange || isInlineValidationSubmitting) {
            return
        }

        setIsInlineValidationSubmitting(true)

        try {
            const isSaved = await handleStatusChange(pendingInlineChange.item, pendingInlineChange.nextValue)

            if (isSaved) {
                setPendingInlineChange(null)
            }
        } finally {
            setIsInlineValidationSubmitting(false)
        }
    }

    const actionColumn = {
        key: "action",
        header: "Action",
        headerClassName: "users-table__action-header",
        cellClassName: "users-table__action-cell",
        headerStyle: { width: "5%", minWidth: 96 },
        cellStyle: { width: "5%", minWidth: 96, whiteSpace: "nowrap" },
        render: (item) => (
            <div className="parent-action-buttons" style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                <ButtonEditBundle
                    title="Edit"
                    aria-label={`Edit ${item.item_name || item.item_code || "bundle"}`}
                    onClick={(event) => {
                        event.stopPropagation()
                        openActionDialog("edit", item)
                    }}
                />
            </div>
        ),
    }

    const tableColumns = [
        actionColumn,
        ...columns,
        {
            key: "status",
            header: "Status",
            headerStyle: { width: "6%", minWidth: 124 },
            cellStyle: { width: "6%", minWidth: 124 },
            render: (item) => {
                const itemId = getItemId(item)
                const statusValue = getItemStatusValue(item)
                const statusVariant = getItemStatusVariant(item)
                const isUpdatingStatus = Boolean(itemId && pendingStatusUpdates[itemId])
                const statusOptions = statusValue
                    ? itemStatusOptions
                    : [{ value: "", label: "Unknown", disabled: true }, ...itemStatusOptions]

                return (
                    <ItemTableSelect
                        id={`bundle-status-${itemId ?? item.item_code ?? item.barcode ?? "unknown"}`}
                        type="status"
                        variant={statusVariant}
                        value={statusValue}
                        options={statusOptions}
                        ariaLabel={`Status ${item.item_name || item.item_code || "bundle"}`}
                        title={isUpdatingStatus ? "Menyimpan status..." : getItemStatusLabel(item)}
                        disabled={isUpdatingStatus || !itemId}
                        onChange={(nextValue) => requestStatusChange(item, nextValue)}
                    />
                )
            },
        },
    ]

    const handleEditConfirm = () => {
        setReloadKey((currentKey) => currentKey + 1)
        closeActionDialog()
    }

    const handleImportFileSelect = async (file) => {
        if (!file || isImportPreviewing) {
            return
        }

        const formData = new FormData()

        formData.append("file", file)
        setImportFileName(file.name)
        setImportPreviewResponse(null)
        setImportErrorMessage("")
        setIsImportPreviewing(true)

        try {
            const previewResponse = await api.itemData.imports.bundlesPreview(formData)

            setImportPreviewResponse(previewResponse)
        } catch (error) {
            setImportErrorMessage(error?.message || "Gagal membuat preview import bundle.")
        } finally {
            setIsImportPreviewing(false)
        }
    }

    const handleImportCommitted = () => {
        setReloadKey((currentKey) => currentKey + 1)
    }

    const setPaginationPage = (nextPage) => {
        if (nextPage === currentPage && paginationState.resetKey === filterResetKey) {
            return
        }

        setPaginationState({
            currentPage: nextPage,
            resetKey: filterResetKey,
        })
    }

    const handlePageSizeChange = (nextPageSize) => {
        if (nextPageSize === pageSize) {
            return
        }

        setPageSize(nextPageSize)
        setPaginationState({
            currentPage: 1,
            resetKey: JSON.stringify({
                filters,
                pageSize: nextPageSize,
                searchQuery: debouncedSearchQuery,
                sortValue,
            }),
        })
    }

    const updateSelectedFilterKeys = (nextFilterKeys) => {
        const validFilterKeySet = new Set(bundleFilterFieldOptions.map((filterConfig) => filterConfig.key))
        const normalizedFilterKeys = Array.from(new Set(nextFilterKeys)).filter((filterKey) =>
            validFilterKeySet.has(filterKey),
        )

        setSelectedFilterKeys(normalizedFilterKeys)
        setFilters((currentFilters) =>
            bundleFilterConfig.reduce(
                (nextFilters, filterConfig) => ({
                    ...nextFilters,
                    [filterConfig.key]: normalizedFilterKeys.includes(filterConfig.key)
                        ? currentFilters[filterConfig.key] ?? ALL_FILTER_VALUE
                        : ALL_FILTER_VALUE,
                }),
                {},
            ),
        )

        if (!normalizedFilterKeys.includes(SORT_FILTER_KEY)) {
            setSortValue(DEFAULT_BUNDLE_SORT)
        }
    }

    const handleFilterKeyToggle = (filterKey) => {
        updateSelectedFilterKeys(
            selectedFilterKeys.includes(filterKey)
                ? selectedFilterKeys.filter((selectedFilterKey) => selectedFilterKey !== filterKey)
                : [...selectedFilterKeys, filterKey],
        )
    }

    const handleFilterChange = (filterKey, nextValue) => {
        if (filters[filterKey] === nextValue) {
            return
        }

        setFilters((currentFilters) => ({
            ...currentFilters,
            [filterKey]: nextValue,
        }))
    }

    const handleSortChange = (event) => {
        const nextSortValue = event.target.value

        if (nextSortValue === sortValue) {
            return
        }

        setSortValue(nextSortValue)
    }

    const handleResetFilters = () => {
        setSelectedFilterKeys([])
        setFilters(defaultBundleFilters)
        setSortValue(DEFAULT_BUNDLE_SORT)
    }

    const loadingPageMessage = `Memuat data bundle halaman ${currentPage}...`
    const paginationSummary = isLoading
        ? `Memuat halaman ${currentPage} dari ${totalPages}`
        : getPaginationSummary(firstItem, lastItem, totalItems)

    const pagination = {
        summary: paginationSummary,
        currentPage: safeCurrentPage,
        totalPages,
        items: getPaginationItems(safeCurrentPage, totalPages),
        pageSize,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "<",
        nextLabel: ">",
        circularButtons: true,
        ariaLabel: "Bundles pagination",
        pageSizeAriaLabel: "Jumlah data bundle per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? loadingPageMessage
        : errorMessage || "Belum ada data bundle untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar parent-table-toolbar--actions" aria-label="Bundle table tools">
                <div className="parent-table-toolbar__lookup">
                    <div className="parent-table-filter-entry" aria-label="Filter bundle">
                        <button
                            type="button"
                            className={[
                                "parent-table-filter-trigger",
                                selectedFilterKeys.length > 0 ? "parent-table-filter-trigger--active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            aria-label="Open bundle filter dialog"
                            title="Filter"
                            onClick={() => setIsFilterDialogOpen(true)}
                        >
                            <FilterFunnel size={18} aria-hidden="true" />
                            {selectedFilterKeys.length > 0 ? (
                                <span className="parent-table-filter-trigger__dot" aria-hidden="true" />
                            ) : null}
                        </button>
                    </div>

                    <div className="parent-table-toolbar__search">
                        <SearchBundle
                            value={searchQuery}
                            onChange={onSearchQueryChange}
                        />
                    </div>
                </div>

                <div className="parent-table-actions parent-table-actions--primary">
                    <ButtonCreateBundle
                        className="parent-table-tool-button parent-table-tool-button--create"
                        aria-label="Create bundle data"
                        onCreated={() => setReloadKey((currentKey) => currentKey + 1)}
                    >
                        Create
                    </ButtonCreateBundle>
                    <ButtonExportBundle
                        variant="action"
                        className="parent-table-tool-button parent-table-tool-button--download"
                        dialogEyebrow="Export Bundle"
                        dialogTitle="Export Bundle Management"
                        aria-label="Export bundle data"
                    >
                        <Export01 size={18} aria-hidden="true" />
                        <span>Export</span>
                    </ButtonExportBundle>
                    <ButtonImportBundle
                        aria-label="Import bundle data"
                        onClick={(event) => {
                            event.preventDefault()
                            openImportDialog()
                        }}
                        disabled={isImportPreviewing}
                        aria-busy={isImportPreviewing}
                    >
                        {isImportPreviewing ? "Previewing..." : "Import"}
                    </ButtonImportBundle>
                </div>
            </div>

            {inlineUpdateErrorMessage ? (
                <p className="register-user-popup__hint item-table__status-error" role="alert">
                    {inlineUpdateErrorMessage}
                </p>
            ) : null}

            <DataTable
                className="mtickets-table parent-table-grid parent-items-table-grid"
                rows={isLoading ? [] : rows}
                columns={tableColumns}
                getRowId={(item) => item.id ?? item.item_code ?? item.barcode}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
                autoHeight={false}
            />

            <DialogFilterBundle
                isOpen={isFilterDialogOpen}
                filterConfigs={bundleFilterConfig}
                filterFieldOptions={bundleFilterFieldOptions}
                selectedFilterKeys={selectedFilterKeys}
                selectedFilterConfigs={selectedFilterConfigs}
                filters={filters}
                filterOptions={filterOptions}
                allFilterValue={ALL_FILTER_VALUE}
                defaultSortValue={DEFAULT_BUNDLE_SORT}
                sortOptions={bundleSortOptions}
                menuProps={bundleFilterMenuProps}
                hasSelectedSortFilter={hasSelectedSortFilter}
                sortValue={sortValue}
                onClose={() => setIsFilterDialogOpen(false)}
                onFilterKeyToggle={handleFilterKeyToggle}
                onFilterChange={handleFilterChange}
                onSortChange={handleSortChange}
                onReset={handleResetFilters}
            />

            <DialogEditBundle
                key={`edit-bundle-${selectedItem?.id ?? selectedItem?.item_code ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Bundle"
                title={`Edit ${selectedItemName}`}
                item={selectedItem}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogValidateInlineBundleStatus
                change={pendingInlineChange}
                isSubmitting={isInlineValidationSubmitting}
                onClose={closeInlineValidationDialog}
                onConfirm={confirmInlineValidationChange}
            />

            <DialogImportBundle
                key={`import-bundle-${importDialogKey}`}
                isOpen={activeActionDialog === "import"}
                eyebrow="Import Bundle"
                title="Preview Import Bundle"
                commitErrorMessage="Gagal commit import bundle."
                errorFileName="bundle-import-errors.xlsx"
                fileName={importFileName}
                previewResponse={importPreviewResponse}
                errorMessage={importErrorMessage}
                isPreviewing={isImportPreviewing}
                templateButton={<ButtonDownloadBundle aria-label="Download template bundle" />}
                onClose={closeImportDialog}
                onCommitted={handleImportCommitted}
                onFileSelect={handleImportFileSelect}
            />
        </div>
    )
}

export default DataTableBundles
