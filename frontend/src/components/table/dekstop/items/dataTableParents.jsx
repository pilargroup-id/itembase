import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteParent from "../../../Dialog/dialog-parent/DialogDeleteParent.jsx"
import DialogEditParent from "../../../Dialog/dialog-parent/DialogEditParent.jsx"
import DialogFilterParent from "../../../Dialog/dialog-parent/DialogFilterParent.jsx"
import DialogImportParent from "../../../Dialog/dialog-parent/DialogImportParent.jsx"
import ButtonCreateParent from "../../../button/parents-buttons/ButtonCreateParent.jsx"
import ButtonEditParent from "../../../button/parents-buttons/ButtonEditParent.jsx"
import ButtonDeleteParent from "../../../button/parents-buttons/ButtonDeleteParent.jsx"
import ButtonImportParent from "../../../button/parents-buttons/ButtonImportParent.jsx"
import ButtonExportParent from "../../../button/parents-buttons/ButtonExportParent.jsx"
import SplitActionButton from "../../../button/SplitActionButton.jsx"
import { parentFilterConfig } from "../../../dropdown/filter-parent/FilterDropdownParent.config.js"
import SearchParent from "../../../search/SearchParent.jsx"
import { Export01, FilterFunnel } from "../../../template/TemplateIcons.jsx"
import DataTable, { DataTableIdentity } from "../DataTable.jsx"
import {
    PAGE_SIZE_OPTIONS,
    getPaginationItems,
} from "../../../../services/items/DataTableitems.js"

const DEFAULT_PARENT_SORT = "date-desc"
const DEFAULT_PARENT_PAGE_SIZE = 50
const ALL_FILTER_VALUE = "all"
const SORT_FILTER_KEY = "sort"
const parentSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
]
const parentFilterMenuProps = {
    PaperProps: {
        className: "parent-table-mui-menu",
        sx: {
            maxHeight: 320,
            borderRadius: "10px",
            mt: 0.5,
        },
    },
}

const defaultParentFilters = parentFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)
const parentFilterFieldOptions = [
    { key: SORT_FILTER_KEY, label: "Sort By" },
    ...parentFilterConfig,
]

function formatDisplayValue(value) {
    const displayValue = String(value ?? "").trim()

    return displayValue || "-"
}

function renderParentValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function formatParentPorts(parent) {
    const ports = Array.isArray(parent?.ports) && parent.ports.length > 0
        ? parent.ports
        : parent?.port
            ? [parent.port]
            : []

    return ports
        .slice()
        .sort((firstPort, secondPort) =>
            Number(firstPort?.sort_order ?? 0) - Number(secondPort?.sort_order ?? 0),
        )
        .map((port) => port?.code || port?.name || port?.port_code || port?.id)
        .filter(Boolean)
        .join(", ")
}

function normalizeParentRows(responseData) {
    if (Array.isArray(responseData)) return responseData
    if (Array.isArray(responseData?.data)) return responseData.data
    if (Array.isArray(responseData?.rows)) return responseData.rows
    if (Array.isArray(responseData?.results)) return responseData.results

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

        if (!value) return null

        const label = normalizeFilterValue(option.label) || value

        return {
            value,
            label,
            searchText: [label, value, option.searchText].filter(Boolean).join(" "),
        }
    }

    const value = normalizeFilterValue(option ?? fallbackValue)

    if (!value) return null

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

    rows.forEach((parent) => {
        const option = normalizeFilterOption(
            filterConfig.getOption?.(parent) ?? filterConfig.getValue(parent),
            filterConfig.getValue(parent),
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

function createParentApiParams(filters, searchQuery, currentPage, pageSize, sortValue) {
    const params = {}

    parentFilterConfig.forEach((filterConfig) => {
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

    return {
        ...params,
        page: currentPage,
        limit: pageSize,
        sort: sortValue || DEFAULT_PARENT_SORT,
    }
}

function getServerPageSummary(rowCount, currentPage, pageSize, totalItems) {
    const currentPageStart = (currentPage - 1) * pageSize
    const firstItem = totalItems === 0 || rowCount === 0 ? 0 : currentPageStart + 1
    const lastItem = totalItems === 0 || rowCount === 0
        ? 0
        : Math.min(currentPageStart + rowCount, totalItems)

    return { firstItem, lastItem }
}

function getPaginationSummary(firstItem, lastItem, totalItems) {
    if (totalItems === 0) return "0 dari 0 data"

    return `${firstItem}-${lastItem} dari ${totalItems} data`
}

function useDebouncedValue(value, delay = 350) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay)

        return () => window.clearTimeout(timeoutId)
    }, [delay, value])

    return debouncedValue
}

const columns = [
    {
        key: "identity",
        header: "Parent Item",
        headerStyle: { width: "13%", minWidth: 210 },
        cellStyle: { width: "13%", minWidth: 210 },
        render: (parent) => (
            <DataTableIdentity
                title={parent.parent_name || parent.item_name || "-"}
                subtitle={parent.parent_code || "-"}
            />
        ),
    },
    {
        key: "brand",
        header: "Brand",
        headerStyle: { width: "10%", minWidth: 140 },
        cellStyle: { width: "10%", minWidth: 140 },
        render: (parent) => renderParentValue(parent.brand?.name),
    },
    {
        key: "subBrand",
        header: "Sub Brand",
        headerStyle: { width: "10%", minWidth: 140 },
        cellStyle: { width: "10%", minWidth: 140 },
        render: (parent) => renderParentValue(parent.sub_brand),
    },
    {
        key: "detailCategory",
        header: "Detail Category",
        headerStyle: { width: "11%", minWidth: 160 },
        cellStyle: { width: "11%", minWidth: 160 },
        render: (parent) => renderParentValue(parent.category?.detail_category),
    },
    {
        key: "subCategory",
        header: "Sub Category",
        headerStyle: { width: "11%", minWidth: 150 },
        cellStyle: { width: "11%", minWidth: 150 },
        render: (parent) => renderParentValue(parent.category?.sub_category),
    },
    {
        key: "mainCategory",
        header: "Main Category",
        headerStyle: { width: "11%", minWidth: 150 },
        cellStyle: { width: "11%", minWidth: 150 },
        render: (parent) => renderParentValue(parent.category?.main_category),
    },
    {
        key: "brandCategory",
        header: "Brand Category",
        headerStyle: { width: "11%", minWidth: 160 },
        cellStyle: { width: "11%", minWidth: 160 },
        render: (parent) => renderParentValue(parent.category?.brand_category),
    },
    {
        key: "itemType",
        header: "Item Source",
        headerStyle: { width: "9%", minWidth: 130 },
        cellStyle: { width: "9%", minWidth: 130 },
        render: (parent) => renderParentValue(parent.item_type?.name),
    },
    {
        key: "port",
        header: "Port",
        headerStyle: { width: "7%", minWidth: 110 },
        cellStyle: { width: "7%", minWidth: 110 },
        render: (parent) => renderParentValue(formatParentPorts(parent)),
    },
]

function DataTableParents({
    searchQuery = "",
    onSearchQueryChange,
    tableLabel = "Item Parents table",
    refreshKey = 0,
}) {
    const [parentRows, setParentRows] = useState([])
    const [filters, setFilters] = useState(defaultParentFilters)
    const [selectedFilterKeys, setSelectedFilterKeys] = useState([])
    const [sortValue, setSortValue] = useState(DEFAULT_PARENT_SORT)
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
    const [pageSize, setPageSize] = useState(DEFAULT_PARENT_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [totalParents, setTotalParents] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedParent, setSelectedParent] = useState(null)
    const [importPreviewResponse, setImportPreviewResponse] = useState(null)
    const [importFileName, setImportFileName] = useState("")
    const [importErrorMessage, setImportErrorMessage] = useState("")
    const [isImportPreviewing, setIsImportPreviewing] = useState(false)
    const [importDialogKey, setImportDialogKey] = useState(0)
    const [reloadKey, setReloadKey] = useState(0)
    const debouncedSearchQuery = useDebouncedValue(searchQuery)
    const tableResetKey = useMemo(
        () => JSON.stringify({ filters, pageSize, searchQuery: debouncedSearchQuery, sortValue }),
        [debouncedSearchQuery, filters, pageSize, sortValue],
    )
    const [paginationState, setPaginationState] = useState({
        currentPage: 1,
        resetKey: tableResetKey,
    })
    const currentPage = paginationState.resetKey === tableResetKey
        ? paginationState.currentPage
        : 1
    const filterOptions = useMemo(
        () =>
            parentFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(parentRows, filterConfig),
                }),
                {},
            ),
        [parentRows],
    )
    const selectedFilterConfigs = useMemo(
        () =>
            selectedFilterKeys
                .map((filterKey) => parentFilterConfig.find((filterConfig) => filterConfig.key === filterKey))
                .filter(Boolean),
        [selectedFilterKeys],
    )
    const hasSelectedSortFilter = selectedFilterKeys.includes(SORT_FILTER_KEY)
    const parentApiParams = useMemo(
        () => createParentApiParams(filters, debouncedSearchQuery, currentPage, pageSize, sortValue),
        [currentPage, debouncedSearchQuery, filters, pageSize, sortValue],
    )
    const safeCurrentPage = Math.min(currentPage, totalPages)
    const rows = parentRows
    const { firstItem, lastItem } = useMemo(
        () => getServerPageSummary(rows.length, safeCurrentPage, pageSize, totalParents),
        [pageSize, rows.length, safeCurrentPage, totalParents],
    )

    const selectedParentName =
        selectedParent?.parent_name || selectedParent?.item_name || selectedParent?.parent_code || "item ini"
    const dialogParent = selectedParent ? { name: selectedParentName } : null

    useEffect(() => {
        let isMounted = true
        const controller = new AbortController()

        const loadItemParents = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.itemParents.list(parentApiParams, { signal: controller.signal })
                const nextParentRows = normalizeParentRows(response)
                const meta = getPaginationMeta(response, nextParentRows)

                if (!isMounted) return

                setParentRows(nextParentRows)
                setTotalParents(meta.total)
                setTotalPages(meta.totalPages)

                if (meta.page > meta.totalPages) {
                    setPaginationState({
                        currentPage: meta.totalPages,
                        resetKey: tableResetKey,
                    })
                }
            } catch (error) {
                if (!isMounted || error?.name === "AbortError") return

                setParentRows([])
                setTotalParents(0)
                setTotalPages(1)
                setErrorMessage(error?.message || "Gagal memuat data item parent.")
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        loadItemParents()

        return () => {
            isMounted = false
            controller.abort()
        }
    }, [parentApiParams, refreshKey, reloadKey, tableResetKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedParent(null)
    }

    const closeImportDialog = () => {
        setActiveActionDialog(null)
        setImportPreviewResponse(null)
        setImportFileName("")
        setImportErrorMessage("")
        setIsImportPreviewing(false)
    }

    const openActionDialog = (dialogType, parent) => {
        setSelectedParent(parent)
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

    const handleImportFileSelect = async (file) => {
        if (!file || isImportPreviewing) return

        const formData = new FormData()

        formData.append("file", file)
        setImportFileName(file.name)
        setImportPreviewResponse(null)
        setImportErrorMessage("")
        setIsImportPreviewing(true)

        try {
            const previewResponse = await api.itemData.imports.parentsPreview(formData)

            setImportPreviewResponse(previewResponse)
        } catch (error) {
            setImportErrorMessage(error?.message || "Gagal membuat preview import parent.")
        } finally {
            setIsImportPreviewing(false)
        }
    }

    const actionColumn = {
        key: "action",
        header: "Action",
        headerClassName: "users-table__action-header",
        cellClassName: "users-table__action-cell",
        headerStyle: { width: "7%", minWidth: 96 },
        cellStyle: { width: "7%", minWidth: 96, whiteSpace: "nowrap" },
        render: (parent) => {
            const itemCount = Number(parent.item_count ?? 0)
            const canDelete = itemCount === 0
            const parentLabel = parent.parent_name || parent.item_name || "item parent"

            return (
                <div className="parent-action-buttons">
                    <ButtonEditParent
                        title="Edit"
                        aria-label={`Edit ${parentLabel}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", parent)
                        }}
                    />
                    {canDelete ? (
                        <ButtonDeleteParent
                            title="Delete"
                            aria-label={`Delete ${parentLabel}`}
                            onClick={(event) => {
                                event.stopPropagation()
                                openActionDialog("delete", parent)
                            }}
                        />
                    ) : null}
                </div>
            )
        },
    }

    const tableColumns = [
        actionColumn,
        ...columns.slice(0, 1),
        {
            key: "itemName",
            header: "Item Name",
            headerStyle: { width: "13%", minWidth: 180 },
            cellStyle: { width: "13%", minWidth: 180 },
            render: (parent) => renderParentValue(parent.item_name),
        },
        ...columns.slice(1),
    ]

    const handleEditConfirm = () => {
        setReloadKey((currentKey) => currentKey + 1)
        closeActionDialog()
    }

    const handleDeleteConfirm = (deletedParent = selectedParent) => {
        if (deletedParent?.id) {
            setParentRows((currentRows) =>
                currentRows.filter((parent) => parent.id !== deletedParent.id),
            )
        }

        closeActionDialog()
    }

    const updateSelectedFilterKeys = (nextFilterKeys) => {
        const validFilterKeySet = new Set(parentFilterFieldOptions.map((filterConfig) => filterConfig.key))
        const normalizedFilterKeys = Array.from(new Set(nextFilterKeys)).filter((filterKey) =>
            validFilterKeySet.has(filterKey),
        )

        setSelectedFilterKeys(normalizedFilterKeys)
        setFilters((currentFilters) =>
            parentFilterConfig.reduce(
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
            setSortValue(DEFAULT_PARENT_SORT)
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
        if (filters[filterKey] === nextValue) return

        setFilters((currentFilters) => ({
            ...currentFilters,
            [filterKey]: nextValue,
        }))
    }

    const handleSortChange = (event) => {
        const nextSortValue = event.target.value

        if (nextSortValue === sortValue) return

        setSortValue(nextSortValue)
    }

    const handleResetFilters = () => {
        setSelectedFilterKeys([])
        setFilters(defaultParentFilters)
        setSortValue(DEFAULT_PARENT_SORT)
    }

    const setPaginationPage = (nextPage) => {
        if (nextPage === currentPage && paginationState.resetKey === tableResetKey) return

        setPaginationState({
            currentPage: nextPage,
            resetKey: tableResetKey,
        })
    }

    const handlePageSizeChange = (nextPageSize) => {
        if (nextPageSize === pageSize) return

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

    const paginationSummary = isLoading
        ? `Memuat halaman ${currentPage} dari ${totalPages}`
        : getPaginationSummary(firstItem, lastItem, totalParents)
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
        ariaLabel: "Item parents pagination",
        pageSizeAriaLabel: "Jumlah data item parent per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }
    const emptyMessage = isLoading
        ? `Memuat data item parent halaman ${currentPage}...`
        : errorMessage || "Belum ada data item parent untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div
                className="parent-table-toolbar parent-table-toolbar--actions parent-table-toolbar--desktop"
                aria-label="Parent table tools"
            >
                <div className="parent-table-toolbar__lookup">
                    <div className="parent-table-filter-entry" aria-label="Filter parent">
                        <button
                            type="button"
                            className={[
                                "parent-table-filter-trigger",
                                selectedFilterKeys.length > 0 ? "parent-table-filter-trigger--active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            aria-label="Open parent filter dialog"
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
                        <SearchParent
                            value={searchQuery}
                            onChange={onSearchQueryChange}
                        />
                    </div>
                </div>

                <div className="parent-table-actions parent-table-actions--primary">
                    <ButtonCreateParent
                        className="parent-table-tool-button parent-table-tool-button--create"
                        aria-label="Create parent data"
                        onCreated={() => setReloadKey((currentKey) => currentKey + 1)}
                        onDeleted={() => setReloadKey((currentKey) => currentKey + 1)}
                    >
                        Create
                    </ButtonCreateParent>
                    <ButtonExportParent
                        variant="action"
                        className="parent-table-tool-button parent-table-tool-button--download"
                        dialogEyebrow="Export Parent"
                        dialogTitle="Export Item Parent Management"
                        aria-label="Export parent data"
                    >
                        <Export01 size={18} aria-hidden="true" />
                        <span>Export</span>
                    </ButtonExportParent>
                    <ButtonImportParent
                        aria-label="Import parent data"
                        onClick={openImportDialog}
                    />
                </div>
            </div>

            <div
                className="parent-table-toolbar parent-table-toolbar--actions parent-table-toolbar--mobile"
                aria-label="Parent table tools (mobile)"
            >
                <div className="parent-table-toolbar__search-group">
                    <div className="parent-table-toolbar__search">
                        <SearchParent
                            value={searchQuery}
                            onChange={onSearchQueryChange}
                        />
                    </div>

                    <SplitActionButton
                        menuLabel="More parent actions"
                        mainAction={
                            <ButtonCreateParent
                                className="parent-table-tool-button parent-table-tool-button--create parent-table-split-button__main"
                                aria-label="Create parent data"
                                onCreated={() => setReloadKey((currentKey) => currentKey + 1)}
                                onDeleted={() => setReloadKey((currentKey) => currentKey + 1)}
                            >
                                Create
                            </ButtonCreateParent>
                        }
                    >
                        <button
                            type="button"
                            role="menuitem"
                            className={[
                                "parent-table-split-button__item",
                                selectedFilterKeys.length > 0 ? "parent-table-split-button__item--active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            aria-label="Open parent filter dialog"
                            onClick={() => setIsFilterDialogOpen(true)}
                        >
                            <FilterFunnel size={17} aria-hidden="true" />
                            <span>Filter</span>
                            {selectedFilterKeys.length > 0 ? (
                                <span className="parent-table-split-button__dot" aria-hidden="true" />
                            ) : null}
                        </button>
                        <ButtonExportParent
                            role="menuitem"
                            variant="action"
                            className="parent-table-split-button__item"
                            dialogEyebrow="Export Parent"
                            dialogTitle="Export Item Parent Management"
                            aria-label="Export parent data"
                        >
                            <Export01 size={17} aria-hidden="true" />
                            <span>Export</span>
                        </ButtonExportParent>
                        <ButtonImportParent
                            role="menuitem"
                            className="parent-table-split-button__item"
                            aria-label="Import parent data"
                            onClick={openImportDialog}
                        />
                    </SplitActionButton>
                </div>
            </div>

            <DataTable
                className="mtickets-table parent-table-grid parent-items-table-grid"
                rows={rows}
                columns={tableColumns}
                getRowId={(parent) => parent.id ?? parent.pic_id ?? parent.parent_code}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
                autoHeight={false}
            />

            <DialogFilterParent
                isOpen={isFilterDialogOpen}
                filterConfigs={parentFilterConfig}
                filterFieldOptions={parentFilterFieldOptions}
                selectedFilterKeys={selectedFilterKeys}
                selectedFilterConfigs={selectedFilterConfigs}
                filters={filters}
                filterOptions={filterOptions}
                allFilterValue={ALL_FILTER_VALUE}
                defaultSortValue={DEFAULT_PARENT_SORT}
                sortOptions={parentSortOptions}
                menuProps={parentFilterMenuProps}
                hasSelectedSortFilter={hasSelectedSortFilter}
                sortValue={sortValue}
                onClose={() => setIsFilterDialogOpen(false)}
                onFilterKeyToggle={handleFilterKeyToggle}
                onFilterChange={handleFilterChange}
                onSortChange={handleSortChange}
                onReset={handleResetFilters}
            />

            <DialogEditParent
                key={`edit-parent-${selectedParent?.id ?? selectedParent?.pic_id ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Item Parent"
                title={`Edit ${selectedParentName}`}
                parent={selectedParent}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeleteParent
                key={`delete-parent-${selectedParent?.id ?? selectedParent?.pic_id ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Item Parent"
                title={`Delete ${selectedParentName}`}
                parent={selectedParent}
                user={dialogParent}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />

            <DialogImportParent
                key={`import-parent-${importDialogKey}`}
                isOpen={activeActionDialog === "import"}
                eyebrow="Import Item Parent"
                title="Preview Import Parent"
                fileName={importFileName}
                previewResponse={importPreviewResponse}
                errorMessage={importErrorMessage}
                isPreviewing={isImportPreviewing}
                onClose={closeImportDialog}
                onCommitted={() => setReloadKey((currentKey) => currentKey + 1)}
                onFileSelect={handleImportFileSelect}
            />
        </div>
    )
}

export default DataTableParents
