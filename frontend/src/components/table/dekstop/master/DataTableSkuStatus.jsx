import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteSkuStatus from "../../../Dialog/dialog-sku-statuses/DialogDeleteSkuStatus.jsx"
import DialogEditSkuStatus from "../../../Dialog/dialog-sku-statuses/DialogEditSkuStatus.jsx"
import ButtonDeleteSkuStatus from "../../../button/sku-statuses-buttons/ButtonDeleteSkuStatus.jsx"
import ButtonEditSkuStatus from "../../../button/sku-statuses-buttons/ButtonEditSkuStatus.jsx"
import FilterDropdownSkuStatus from "../../../dropdown/filter-sku-statuses/FilterDropdownSkuStatus.jsx"
import { skuStatusFilterConfig } from "../../../dropdown/filter-sku-statuses/FilterDropdownSkuStatus.config.js"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_SKU_STATUS_PAGE_SIZE = 25
const SKU_STATUS_PAGE_SIZE_OPTIONS = [25, 50, 100]
const DEFAULT_SKU_STATUS_SORT = "date-desc"
const skuStatusSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
    { value: "name-asc", label: "Name Asc" },
    { value: "name-desc", label: "Name Desc" },
]

const defaultSkuStatusFilters = skuStatusFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)

function normalizeSkuStatusRows(responseData) {
    if (Array.isArray(responseData)) {
        return responseData
    }

    if (Array.isArray(responseData?.data)) {
        return responseData.data
    }

    if (Array.isArray(responseData?.rows)) {
        return responseData.rows
    }

    if (Array.isArray(responseData?.results)) {
        return responseData.results
    }

    return []
}

function getSkuStatusId(skuStatus) {
    return skuStatus?.id ?? skuStatus?.sku_status_id ?? null
}

function getSkuStatusValue(skuStatus) {
    if (skuStatus?.is_active !== undefined && skuStatus?.is_active !== null) {
        return Number(skuStatus.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(skuStatus?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

function getSkuStatusLabel(skuStatus) {
    const statusValue = getSkuStatusValue(skuStatus)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "-"
}

function getSkuStatusVariant(skuStatus) {
    const statusValue = getSkuStatusValue(skuStatus)

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

function renderSkuStatusValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function matchesSearch(skuStatus, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        skuStatus.code,
        skuStatus.sku_status_code,
        skuStatus.name,
        skuStatus.sku_status_name,
        getSkuStatusLabel(skuStatus),
    ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery))
}

function normalizeFilterValue(value) {
    return String(value ?? "").trim()
}

function createFilterOptions(rows, filterConfig) {
    if (Array.isArray(filterConfig.options)) {
        return [
            { value: ALL_FILTER_VALUE, label: filterConfig.placeholder },
            ...filterConfig.options,
        ]
    }

    const uniqueOptions = new Map()

    rows.forEach((skuStatus) => {
        const customOption = filterConfig.getOption?.(skuStatus)

        if (customOption?.value) {
            uniqueOptions.set(String(customOption.value), {
                value: String(customOption.value),
                label: String(customOption.label ?? customOption.value),
            })
            return
        }

        const value = normalizeFilterValue(filterConfig.getValue(skuStatus))

        if (value) {
            uniqueOptions.set(value, { value, label: value })
        }
    })

    const options = Array.from(uniqueOptions.values()).sort((firstOption, secondOption) =>
        firstOption.label.localeCompare(secondOption.label),
    )

    return [{ value: ALL_FILTER_VALUE, label: filterConfig.placeholder }, ...options]
}

function getSkuStatusDateValue(skuStatus) {
    const dateValue =
        skuStatus.created_at ??
        skuStatus.createdAt ??
        skuStatus.updated_at ??
        skuStatus.updatedAt ??
        skuStatus.date ??
        skuStatus.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortSkuStatusRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstSkuStatus, secondSkuStatus) =>
                String(firstSkuStatus.name ?? firstSkuStatus.sku_status_name ?? "").localeCompare(
                    String(secondSkuStatus.name ?? secondSkuStatus.sku_status_name ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstSkuStatus, secondSkuStatus) => {
        const dateDifference =
            (getSkuStatusDateValue(firstSkuStatus) - getSkuStatusDateValue(secondSkuStatus)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstSkuStatus.code ?? firstSkuStatus.sku_status_code ?? "").localeCompare(
                String(secondSkuStatus.code ?? secondSkuStatus.sku_status_code ?? ""),
            ) * sortDirection
        )
    })
}

function matchesSkuStatusFilters(skuStatus, filters) {
    return skuStatusFilterConfig.every((filterConfig) => {
        const selectedValue = filters[filterConfig.key]

        if (!selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return true
        }

        return normalizeFilterValue(filterConfig.getValue(skuStatus)) === selectedValue
    })
}

function getPageRows(filteredRows, currentPage, pageSize) {
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
    const safeCurrentPage = Math.min(currentPage, totalPages)
    const currentPageStart = (safeCurrentPage - 1) * pageSize
    const rows = filteredRows.slice(currentPageStart, currentPageStart + pageSize)
    const firstItem = filteredRows.length === 0 ? 0 : currentPageStart + 1
    const lastItem =
        filteredRows.length === 0
            ? 0
            : Math.min(currentPageStart + rows.length, filteredRows.length)

    return {
        totalPages,
        safeCurrentPage,
        rows,
        firstItem,
        lastItem,
    }
}

function getPaginationSummary(firstItem, lastItem, totalItems) {
    if (totalItems === 0) {
        return "0 dari 0 data"
    }

    return `${firstItem}-${lastItem} dari ${totalItems} data`
}

const columns = [
    {
        key: "identity",
        header: "SKU Status",
        headerStyle: { width: "36%" },
        cellStyle: { width: "36%" },
        render: (skuStatus) => (
            <DataTableIdentity
                title={skuStatus.name || skuStatus.sku_status_name || "-"}
                subtitle={skuStatus.code || skuStatus.sku_status_code || "-"}
            />
        ),
    },
    {
        key: "code",
        header: "Code",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (skuStatus) => renderSkuStatusValue(skuStatus.code || skuStatus.sku_status_code),
    },
]

function DataTableSkuStatuses({
    searchQuery = "",
    tableLabel = "SKU Statuses table",
    refreshKey = 0,
}) {
    const [skuStatusRows, setSkuStatusRows] = useState([])
    const [filters, setFilters] = useState(defaultSkuStatusFilters)
    const [sortValue, setSortValue] = useState(DEFAULT_SKU_STATUS_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_SKU_STATUS_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedSkuStatus, setSelectedSkuStatus] = useState(null)
    const [reloadKey, setReloadKey] = useState(0)
    const filterResetKey = useMemo(
        () => JSON.stringify({ filters, pageSize, searchQuery, sortValue }),
        [filters, pageSize, searchQuery, sortValue],
    )
    const [paginationState, setPaginationState] = useState({
        currentPage: 1,
        resetKey: filterResetKey,
    })
    const currentPage =
        paginationState.resetKey === filterResetKey ? paginationState.currentPage : 1

    const filterOptions = useMemo(
        () =>
            skuStatusFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(skuStatusRows, filterConfig),
                }),
                {},
            ),
        [skuStatusRows],
    )
    const filteredRows = useMemo(
        () =>
            skuStatusRows.filter(
                (skuStatus) => matchesSearch(skuStatus, searchQuery) && matchesSkuStatusFilters(skuStatus, filters),
            ),
        [skuStatusRows, filters, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortSkuStatusRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedSkuStatusName =
        selectedSkuStatus?.name || selectedSkuStatus?.sku_status_name || selectedSkuStatus?.code || "status ini"

    useEffect(() => {
        let isMounted = true

        const loadSkuStatuses = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.skuStatuses.list()

                if (!isMounted) {
                    return
                }

                setSkuStatusRows(normalizeSkuStatusRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setSkuStatusRows([])
                setErrorMessage(error?.message || "Gagal memuat data SKU status.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadSkuStatuses()

        return () => {
            isMounted = false
        }
    }, [refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedSkuStatus(null)
    }

    const openActionDialog = (dialogType, skuStatus) => {
        setSelectedSkuStatus(skuStatus)
        setActiveActionDialog(dialogType)
    }

    const toggleSkuStatus = async (skuStatus) => {
        const skuStatusId = getSkuStatusId(skuStatus)
        const currentStatus = getSkuStatusValue(skuStatus) === "1" ? 1 : 0
        const newStatus = currentStatus === 1 ? 0 : 1
        const previousSkuStatusRows = [...skuStatusRows]

        setSkuStatusRows((currentRows) =>
            currentRows.map((row) =>
                getSkuStatusId(row) === skuStatusId
                    ? { ...row, is_active: newStatus, status: newStatus === 1 ? "active" : "inactive" }
                    : row,
            ),
        )

        try {
            await api.skuStatuses.updateStatus(skuStatusId, newStatus)
        } catch (error) {
            setSkuStatusRows(previousSkuStatusRows)
            setErrorMessage(error?.message || "Gagal mengubah status SKU.")
        }
    }

    const tableColumns = [
        ...columns,
        {
            key: "status",
            header: "Status",
            headerStyle: { width: "18%" },
            cellStyle: { width: "18%" },
            render: (skuStatus) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="checkbox"
                        checked={getSkuStatusValue(skuStatus) === "1"}
                        onChange={(event) => {
                            event.stopPropagation()
                            toggleSkuStatus(skuStatus)
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        title={`Tandai ${skuStatus.name || skuStatus.sku_status_name || "status ini"} sebagai ${getSkuStatusValue(skuStatus) === "1" ? "non-aktif" : "aktif"}`}
                    />
                    <DataTableStatus inline variant={getSkuStatusVariant(skuStatus)}>
                        {getSkuStatusLabel(skuStatus)}
                    </DataTableStatus>
                </div>
            ),
        },
        {
            key: "action",
            header: "Action",
            headerClassName: "users-table__action-header",
            cellClassName: "users-table__action-cell",
            headerStyle: { width: "24%" },
            cellStyle: { width: "24%", whiteSpace: "nowrap" },
            render: (skuStatus) => (
                <div className="parent-action-buttons">
                    <ButtonEditSkuStatus
                        title="Edit"
                        aria-label={`Edit ${skuStatus.name || skuStatus.sku_status_name || "status ini"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", skuStatus)
                        }}
                    />
                    <ButtonDeleteSkuStatus
                        title="Delete"
                        aria-label={`Delete ${skuStatus.name || skuStatus.sku_status_name || "status ini"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("delete", skuStatus)
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

    const handleDeleteConfirm = (deletedSkuStatus = selectedSkuStatus) => {
        const deletedSkuStatusId = getSkuStatusId(deletedSkuStatus)

        if (deletedSkuStatusId) {
            setSkuStatusRows((currentRows) =>
                currentRows.filter((skuStatus) => getSkuStatusId(skuStatus) !== deletedSkuStatusId),
            )
        }

        closeActionDialog()
    }

    const handleFilterChange = (filterKey, nextValue) => {
        setFilters((currentFilters) => ({
            ...currentFilters,
            [filterKey]: nextValue,
        }))
    }

    const setPaginationPage = (nextPage) => {
        setPaginationState({
            currentPage: nextPage,
            resetKey: filterResetKey,
        })
    }

    const handlePageSizeChange = (nextPageSize) => {
        setPageSize(nextPageSize)
        setPaginationState({
            currentPage: 1,
            resetKey: JSON.stringify({ filters, pageSize: nextPageSize, searchQuery, sortValue }),
        })
    }

    const pagination = {
        summary: getPaginationSummary(firstItem, lastItem, sortedRows.length),
        currentPage: safeCurrentPage,
        totalPages,
        items: getPaginationItems(safeCurrentPage, totalPages),
        pageSize,
        pageSizeOptions: SKU_STATUS_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "SKU Status pagination",
        pageSizeAriaLabel: "Jumlah data SKU status per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data SKU status..."
        : errorMessage || "Belum ada data SKU status untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-filters" aria-label="Filter SKU status">
                    <FilterDropdownSkuStatus
                        className="parent-table-filter parent-table-filter--sort"
                        options={skuStatusSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Date Desc"
                        searchable={false}
                        onChange={setSortValue}
                    />
                    {skuStatusFilterConfig.map((filterConfig) => (
                        <FilterDropdownSkuStatus
                            key={filterConfig.key}
                            className="parent-table-filter"
                            options={filterOptions[filterConfig.key]}
                            value={filters[filterConfig.key]}
                            label={filterConfig.label}
                            placeholder={filterConfig.placeholder}
                            searchPlaceholder={filterConfig.searchPlaceholder}
                            emptyMessage={filterConfig.emptyMessage}
                            onChange={(nextValue) => handleFilterChange(filterConfig.key, nextValue)}
                        />
                    ))}
                </div>
            </div>

            <DataTable
                className="mtickets-table"
                rows={rows}
                columns={tableColumns}
                getRowId={(skuStatus) => getSkuStatusId(skuStatus) ?? skuStatus.code ?? skuStatus.sku_status_code}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />

            <DialogEditSkuStatus
                key={`edit-sku-status-${getSkuStatusId(selectedSkuStatus) ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit SKU Status"
                title={`Edit ${selectedSkuStatusName}`}
                skuStatus={selectedSkuStatus}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeleteSkuStatus
                key={`delete-sku-status-${getSkuStatusId(selectedSkuStatus) ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete SKU Status"
                title={`Delete ${selectedSkuStatusName}`}
                skuStatus={selectedSkuStatus}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />
        </div>
    )
}

export default DataTableSkuStatuses 
