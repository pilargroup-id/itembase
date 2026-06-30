import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteUom from "../../../dialog/dialog-uoms/DialogDeleteUom.jsx"
import DialogEditUom from "../../../dialog/dialog-uoms/DialogEditUom.jsx"
import ButtonDeleteUom from "../../../button/uoms-buttons/ButtonDeleteUom.jsx"
import ButtonEditUom from "../../../button/uoms-buttons/ButtonEditUom.jsx"
import FilterDropdownUom from "../../../dropdown/filter-uoms/FilterDropdownUom.jsx"
import { uomFilterConfig } from "../../../dropdown/filter-uoms/FilterDropdownUom.config.js"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_UOM_PAGE_SIZE = 25
const UOM_PAGE_SIZE_OPTIONS = [25, 50, 100]
const DEFAULT_UOM_SORT = "date-desc"
const uomSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
    { value: "name-asc", label: "Name Asc" },
    { value: "name-desc", label: "Name Desc" },
]

const defaultUomFilters = uomFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)

function normalizeUomRows(responseData) {
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

function getUomId(uom) {
    return uom?.id ?? uom?.uom_id ?? null
}

function getUomStatusValue(uom) {
    if (uom?.is_active !== undefined && uom?.is_active !== null) {
        return Number(uom.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(uom?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

function getUomStatusLabel(uom) {
    const statusValue = getUomStatusValue(uom)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "-"
}

function getUomStatusVariant(uom) {
    const statusValue = getUomStatusValue(uom)

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

function renderUomValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function matchesSearch(uom, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        uom.code,
        uom.uom_code,
        uom.name,
        uom.uom_name,
        getUomStatusLabel(uom),
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

    rows.forEach((uom) => {
        const customOption = filterConfig.getOption?.(uom)

        if (customOption?.value) {
            uniqueOptions.set(String(customOption.value), {
                value: String(customOption.value),
                label: String(customOption.label ?? customOption.value),
            })
            return
        }

        const value = normalizeFilterValue(filterConfig.getValue(uom))

        if (value) {
            uniqueOptions.set(value, { value, label: value })
        }
    })

    const options = Array.from(uniqueOptions.values()).sort((firstOption, secondOption) =>
        firstOption.label.localeCompare(secondOption.label),
    )

    return [{ value: ALL_FILTER_VALUE, label: filterConfig.placeholder }, ...options]
}

function getUomDateValue(uom) {
    const dateValue =
        uom.created_at ??
        uom.createdAt ??
        uom.updated_at ??
        uom.updatedAt ??
        uom.date ??
        uom.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortUomRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstUom, secondUom) =>
                String(firstUom.name ?? firstUom.uom_name ?? "").localeCompare(
                    String(secondUom.name ?? secondUom.uom_name ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstUom, secondUom) => {
        const dateDifference =
            (getUomDateValue(firstUom) - getUomDateValue(secondUom)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstUom.code ?? firstUom.uom_code ?? "").localeCompare(
                String(secondUom.code ?? secondUom.uom_code ?? ""),
            ) * sortDirection
        )
    })
}

function matchesUomFilters(uom, filters) {
    return uomFilterConfig.every((filterConfig) => {
        const selectedValue = filters[filterConfig.key]

        if (!selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return true
        }

        return normalizeFilterValue(filterConfig.getValue(uom)) === selectedValue
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
        header: "UOM",
        headerStyle: { width: "36%" },
        cellStyle: { width: "36%" },
        render: (uom) => (
            <DataTableIdentity
                title={uom.name || uom.uom_name || "-"}
                subtitle={uom.code || uom.uom_code || "-"}
            />
        ),
    },
    {
        key: "code",
        header: "Code",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (uom) => renderUomValue(uom.code || uom.uom_code),
    },
]

function DataTableUom({
    searchQuery = "",
    tableLabel = "Uom table",
    refreshKey = 0,
}) {
    const [uomRows, setUomRows] = useState([])
    const [filters, setFilters] = useState(defaultUomFilters)
    const [sortValue, setSortValue] = useState(DEFAULT_UOM_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_UOM_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedUom, setSelectedUom] = useState(null)
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
            uomFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(uomRows, filterConfig),
                }),
                {},
            ),
        [uomRows],
    )
    const filteredRows = useMemo(
        () =>
            uomRows.filter(
                (uom) => matchesSearch(uom, searchQuery) && matchesUomFilters(uom, filters),
            ),
        [uomRows, filters, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortUomRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedUomName =
        selectedUom?.name || selectedUom?.uom_name || selectedUom?.code || "uom ini"

    useEffect(() => {
        let isMounted = true

        const loadUoms = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.uoms.list()

                if (!isMounted) {
                    return
                }

                setUomRows(normalizeUomRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setUomRows([])
                setErrorMessage(error?.message || "Gagal memuat data uom.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadUoms()

        return () => {
            isMounted = false
        }
    }, [refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedUom(null)
    }

    const openActionDialog = (dialogType, uom) => {
        setSelectedUom(uom)
        setActiveActionDialog(dialogType)
    }

    const toggleUomStatus = async (uom) => {
        const uomId = getUomId(uom)
        const currentStatus = getUomStatusValue(uom) === "1" ? 1 : 0
        const newStatus = currentStatus === 1 ? 0 : 1
        const previousUomRows = [...uomRows]

        setUomRows((currentRows) =>
            currentRows.map((row) =>
                getUomId(row) === uomId
                    ? { ...row, is_active: newStatus, status: newStatus === 1 ? "active" : "inactive" }
                    : row,
            ),
        )

        try {
            await api.uoms.updateStatus(uomId, newStatus)
        } catch (error) {
            setUomRows(previousUomRows)
            setErrorMessage(error?.message || "Gagal mengubah status uom.")
        }
    }

    const tableColumns = [
        ...columns,
        {
            key: "status",
            header: "Status",
            headerStyle: { width: "18%" },
            cellStyle: { width: "18%" },
            render: (uom) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="checkbox"
                        checked={getUomStatusValue(uom) === "1"}
                        onChange={(event) => {
                            event.stopPropagation()
                            toggleUomStatus(uom)
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        title={`Tandai ${uom.name || uom.uom_name || "uom"} sebagai ${getUomStatusValue(uom) === "1" ? "non-aktif" : "aktif"}`}
                    />
                    <DataTableStatus inline variant={getUomStatusVariant(uom)}>
                        {getUomStatusLabel(uom)}
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
            render: (uom) => (
                <div className="parent-action-buttons">
                    <ButtonEditUom
                        title="Edit"
                        aria-label={`Edit ${uom.name || uom.uom_name || "uom"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", uom)
                        }}
                    />
                    <ButtonDeleteUom
                        title="Delete"
                        aria-label={`Delete ${uom.name || uom.uom_name || "uom"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("delete", uom)
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

    const handleDeleteConfirm = (deletedUom = selectedUom) => {
        const deletedUomId = getUomId(deletedUom)

        if (deletedUomId) {
            setUomRows((currentRows) =>
                currentRows.filter((uom) => getUomId(uom) !== deletedUomId),
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
        pageSizeOptions: UOM_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "Uom pagination",
        pageSizeAriaLabel: "Jumlah data uom per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data uom..."
        : errorMessage || "Belum ada data uom untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-filters" aria-label="Filter uom">
                    <FilterDropdownUom
                        className="parent-table-filter parent-table-filter--sort"
                        options={uomSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Date Desc"
                        searchable={false}
                        onChange={setSortValue}
                    />
                    {uomFilterConfig.map((filterConfig) => (
                        <FilterDropdownUom
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
                getRowId={(uom) => getUomId(uom) ?? uom.code ?? uom.uom_code}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />

            <DialogEditUom
                key={`edit-uom-${getUomId(selectedUom) ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Uom"
                title={`Edit ${selectedUomName}`}
                uom={selectedUom}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeleteUom
                key={`delete-uom-${getUomId(selectedUom) ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Uom"
                title={`Delete ${selectedUomName}`}
                uom={selectedUom}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />
        </div>
    )
}

export default DataTableUom
