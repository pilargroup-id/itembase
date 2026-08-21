import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogEditBundle from "../../../Dialog/dialog-bundles/DialogEditBundle.jsx"
import DialogValidateStatusBundle from "../../../Dialog/dialog-bundles/DialogValidateStatusBundle.jsx"
import DialogImportItem from "../../../Dialog/dialog-item/DialogImportItem.jsx"
import ButtonDownloadBundle from "../../../button/bundles-buttons/ButtonDownloadBundle.jsx"
import ButtonEditBundle from "../../../button/bundles-buttons/ButtonEditBundle.jsx"
import ButtonImportBundle from "../../../button/bundles-buttons/ButtonImportBundle.jsx"
import FilterDropdownBundle from "../../../dropdown/filter-bundles/FilterDropdownBundles.jsx"
import { itemFilterConfig } from "../../../dropdown/filter-bundles/FilterDropdownBundles.config.js"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import {
    DEFAULT_PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
    getPaginationItems,
} from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
export const DEFAULT_BUNDLE_SORT = "date-desc"
export const bundleSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
]

export const defaultBundleFilters = itemFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)
const visibleBundleFilterConfigs = itemFilterConfig.filter(
    (filterConfig) =>
        !["itemCode", "barcode", "itemKind", "skuStatus", "uom"].includes(filterConfig.key),
)

function getItemId(item) {
    return item?.id ?? item?.item_id ?? null
}

function getItemStatusValue(item) {
    if (item?.is_active !== undefined && item?.is_active !== null) {
        return Number(item.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(item?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

function getItemStatusLabel(item) {
    const statusValue = getItemStatusValue(item)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "-"
}

function getItemStatusVariant(item) {
    const statusValue = getItemStatusValue(item)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "pending"
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

    itemFilterConfig.forEach((filterConfig) => {
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

const columns = [
    {
        key: "identity",
        header: "Item",
        headerStyle: { width: "18%" },
        cellStyle: { width: "18%" },
        render: (item) => (
            <DataTableIdentity
                title={item.item_name || "-"}
                subtitle={item.item_code || "-"}
            />
        ),
    },

    {
        key: "barcode",
        header: "Barcode",
        headerStyle: { width: "9%" },
        cellStyle: { width: "9%" },
        render: (item) => renderItemValue(item.barcode),
    },
    {
        key: "parent",
        header: "Parent",
        headerStyle: { width: "15%" },
        cellStyle: { width: "15%" },
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
        headerStyle: { width: "7%" },
        cellStyle: { width: "7%" },
        render: (item) => renderItemValue(item.parent?.brand?.name),
    },
    {
        key: "category",
        header: "Category",
        headerStyle: { width: "10%" },
        cellStyle: { width: "10%" },
        render: (item) => renderItemValue(item.parent?.category?.detail_category),
    },
    {
        key: "uom",
        header: "UOM",
        headerStyle: { width: "5%" },
        cellStyle: { width: "5%" },
        render: (item) => renderItemValue(item.uom?.code ?? item.uom?.name),
    },
    {
        key: "pack",
        header: "Pack",
        headerStyle: { width: "6%" },
        cellStyle: { width: "6%" },
        render: (item) => renderItemValue(formatNumberValue(item.qty_per_pack)),
    },
    {
        key: "components",
        header: "Components",
        headerStyle: { width: "8%" },
        cellStyle: { width: "8%" },
        render: (item) => renderItemValue(
            Array.isArray(item.components) ? item.components.length : "-"
        ),
    },
]

function DataTableBundles({
    searchQuery = "",
    tableLabel = "Bundles table",
    refreshKey = 0,
    filters = defaultBundleFilters,
    sortValue = DEFAULT_BUNDLE_SORT,
    sortOptions = bundleSortOptions,
    onApplyFilters,
}) {
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
            itemFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(itemRows, filterConfig),
                }),
                {},
            ),
        [itemRows],
    )
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

    const handleStatusChanged = (changedItem, newStatus) => {
        const itemId = getItemId(changedItem)

        setItemRows((currentRows) =>
            currentRows.map((row) =>
                getItemId(row) === itemId
                    ? { ...row, is_active: newStatus, status: newStatus === 1 ? "active" : "inactive" }
                    : row,
            ),
        )

        closeActionDialog()
    }

    const tableColumns = [
        ...columns,
        {
            key: "status",
            header: "Status",
            headerStyle: { width: "8%" },
            cellStyle: { width: "8%" },
            render: (item) => (
                <div className="item-table__status-cell" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label
                        className="users-table__toggle item-table__status-toggle"
                        onClick={(event) => event.stopPropagation()}
                        title={`Tandai ${item.item_name || item.item_code || "bundle"} sebagai ${getItemStatusValue(item) === "1" ? "non-aktif" : "aktif"}`}
                    >
                        <input
                            type="checkbox"
                            checked={getItemStatusValue(item) === "1"}
                            onChange={() => openActionDialog("status", item)}
                        />
                        <span className="users-table__toggle-track" aria-hidden="true" />
                        <span className="users-table__toggle-thumb" aria-hidden="true" />
                    </label>
                    <DataTableStatus inline variant={getItemStatusVariant(item)}>
                        {getItemStatusLabel(item)}
                    </DataTableStatus>
                </div>
            ),
        },
        {
            key: "action",
            header: "Action",
            headerClassName: "users-table__action-header",
            cellClassName: "users-table__action-cell",
            headerStyle: { width: "5%" },
            cellStyle: { width: "5%", whiteSpace: "nowrap" },
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
        setImportDialogKey((currentKey) => currentKey + 1)
        setImportFileName(file.name)
        setImportPreviewResponse(null)
        setImportErrorMessage("")
        setActiveActionDialog("import")
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

    const handleFilterChange = (filterKey, nextValue) => {
        if (filters[filterKey] === nextValue) {
            return
        }

        onApplyFilters?.({
            filters: {
                ...filters,
                [filterKey]: nextValue,
            },
            sortValue,
        })
    }

    const handleSortChange = (nextSortValue) => {
        if (nextSortValue === sortValue) {
            return
        }

        onApplyFilters?.({
            filters,
            sortValue: nextSortValue,
        })
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
            <div className="parent-table-backdrop" aria-label="Bundle table tools">
                <div className="parent-table-actions">
                    <ButtonDownloadBundle aria-label="Download bundle data" />
                    <ButtonImportBundle
                        aria-label="Import bundle data"
                        onFileSelect={handleImportFileSelect}
                        disabled={isImportPreviewing}
                        aria-busy={isImportPreviewing}
                    >
                        {isImportPreviewing ? "Previewing..." : "Import"}
                    </ButtonImportBundle>
                </div>

                <div className="parent-table-filters" aria-label="Filter bundle">
                    <FilterDropdownBundle
                        className="parent-table-filter parent-table-filter--sort"
                        options={sortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Sort By"
                        searchable={false}
                        onChange={handleSortChange}
                    />
                    {visibleBundleFilterConfigs.map((filterConfig) => (
                        <FilterDropdownBundle
                            key={filterConfig.key}
                            className="parent-table-filter"
                            options={filterOptions[filterConfig.key] ?? []}
                            value={filters[filterConfig.key]}
                            label={filterConfig.label}
                            placeholder={filterConfig.placeholder}
                            searchPlaceholder={filterConfig.searchPlaceholder}
                            emptyMessage={filterConfig.emptyMessage}
                            searchable={filterConfig.searchable ?? true}
                            onChange={(nextValue) => handleFilterChange(filterConfig.key, nextValue)}
                        />
                    ))}
                </div>
            </div>

            <DataTable
                className="mtickets-table"
                rows={isLoading ? [] : rows}
                columns={tableColumns}
                getRowId={(item) => item.id ?? item.item_code ?? item.barcode}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
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

            <DialogValidateStatusBundle
                key={`status-bundle-${selectedItem?.id ?? selectedItem?.item_code ?? "empty"}`}
                isOpen={activeActionDialog === "status"}
                eyebrow="Ubah Status Bundle"
                title="Konfirmasi Perubahan Status"
                item={selectedItem}
                onClose={closeActionDialog}
                onChanged={handleStatusChanged}
            />

            <DialogImportItem
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
                onClose={closeImportDialog}
                onCommitted={handleImportCommitted}
            />
        </div>
    )
}

export default DataTableBundles
