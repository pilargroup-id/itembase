import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeletePics from "../../../Dialog/dialog-pics/DialogDeletePics.jsx"
import DialogEditPics from "../../../Dialog/dialog-pics/DialogEditPics.jsx"
import ButtonDeletePics from "../../../button/pics-buttons/ButtonDeletePics.jsx"
import ButtonEditPics from "../../../button/pics-buttons/ButtonEditPics.jsx"
import FilterDropdownPics from "../../../dropdown/filter-pics/FilterDropdownPics.jsx"
import { picsFilterConfig } from "../../../dropdown/filter-pics/FilterDropdownPics.config.js"
import DataTable, {
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_PICS_PAGE_SIZE = 25
const PICS_PAGE_SIZE_OPTIONS = [25, 50, 100]
const DEFAULT_PICS_SORT = "date-desc"
const picsSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
    { value: "name-asc", label: "Name Asc" },
    { value: "name-desc", label: "Name Desc" },
]

const defaultPicsFilters = picsFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)

function normalizePicsRows(responseData) {
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

function getPicsId(pics) {
    return pics?.id ?? pics?.pics_id ?? null
}

function getPicsStatusValue(pics) {
    if (pics?.is_active !== undefined && pics?.is_active !== null) {
        return Number(pics.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(pics?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

function getPicsStatusLabel(pics) {
    const statusValue = getPicsStatusValue(pics)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "-"
}

function getPicsStatusVariant(pics) {
    const statusValue = getPicsStatusValue(pics)

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

function renderPicsValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function matchesSearch(pics, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        pics.code,
        pics.pics_code,
        pics.name,
        pics.pics_name,
        getPicsStatusLabel(pics),
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

    rows.forEach((pics) => {
        const customOption = filterConfig.getOption?.(pics)

        if (customOption?.value) {
            uniqueOptions.set(String(customOption.value), {
                value: String(customOption.value),
                label: String(customOption.label ?? customOption.value),
            })
            return
        }

        const value = normalizeFilterValue(filterConfig.getValue(pics))

        if (value) {
            uniqueOptions.set(value, { value, label: value })
        }
    })

    const options = Array.from(uniqueOptions.values()).sort((firstOption, secondOption) =>
        firstOption.label.localeCompare(secondOption.label),
    )

    return [{ value: ALL_FILTER_VALUE, label: filterConfig.placeholder }, ...options]
}

function getPicsDateValue(pics) {
    const dateValue =
        pics.created_at ??
        pics.createdAt ??
        pics.updated_at ??
        pics.updatedAt ??
        pics.date ??
        pics.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortPicsRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstPics, secondPics) =>
                String(firstPics.name ?? firstPics.pics_name ?? "").localeCompare(
                    String(secondPics.name ?? secondPics.pics_name ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstPics, secondPics) => {
        const dateDifference =
            (getPicsDateValue(firstPics) - getPicsDateValue(secondPics)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstPics.code ?? firstPics.pics_code ?? "").localeCompare(
                String(secondPics.code ?? secondPics.pics_code ?? ""),
            ) * sortDirection
        )
    })
}

function matchesPicsFilters(pics, filters) {
    return picsFilterConfig.every((filterConfig) => {
        const selectedValue = filters[filterConfig.key]

        if (!selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return true
        }

        return normalizeFilterValue(filterConfig.getValue(pics)) === selectedValue
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
        key: "name",
        header: "Name",
        headerStyle: { width: "34%" },
        cellStyle: { width: "34%" },
        render: (pics) => renderPicsValue(pics.name || pics.pics_name),
    },
    {
        key: "code",
        header: "Code",
        headerStyle: { width: "24%" },
        cellStyle: { width: "24%" },
        render: (pics) => renderPicsValue(pics.code || pics.pics_code),
    },
]

function DataTablePics({
    searchQuery = "",
    tableLabel = "Pics table",
    refreshKey = 0,
}) {
    const [picsRows, setPicsRows] = useState([])
    const [filters, setFilters] = useState(defaultPicsFilters)
    const [sortValue, setSortValue] = useState(DEFAULT_PICS_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_PICS_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedPics, setSelectedPics] = useState(null)
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
            picsFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(picsRows, filterConfig),
                }),
                {},
            ),
        [picsRows],
    )
    const filteredRows = useMemo(
        () =>
            picsRows.filter(
                (pics) => matchesSearch(pics, searchQuery) && matchesPicsFilters(pics, filters),
            ),
        [picsRows, filters, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortPicsRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedPicsName =
        selectedPics?.name || selectedPics?.pics_name || selectedPics?.code || "pics ini"

    useEffect(() => {
        let isMounted = true

        const loadPics = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.pics.list()

                if (!isMounted) {
                    return
                }

                setPicsRows(normalizePicsRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setPicsRows([])
                setErrorMessage(error?.message || "Gagal memuat data pics.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadPics()

        return () => {
            isMounted = false
        }
    }, [refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedPics(null)
    }

    const openActionDialog = (dialogType, pics) => {
        setSelectedPics(pics)
        setActiveActionDialog(dialogType)
    }

    const togglePicsStatus = async (pics) => {
        const picsId = getPicsId(pics)
        const currentStatus = getPicsStatusValue(pics) === "1" ? 1 : 0
        const newStatus = currentStatus === 1 ? 0 : 1
        const previousPicsRows = [...picsRows]

        setPicsRows((currentRows) =>
            currentRows.map((row) =>
                getPicsId(row) === picsId
                    ? { ...row, is_active: newStatus, status: newStatus === 1 ? "active" : "inactive" }
                    : row,
            ),
        )

        try {
            await api.pics.updateStatus(picsId, newStatus)
        } catch (error) {
            setPicsRows(previousPicsRows)
            setErrorMessage(error?.message || "Gagal mengubah status pics.")
        }
    }

    const tableColumns = [
        ...columns,
        {
            key: "status",
            header: "Status",
            headerStyle: { width: "18%" },
            cellStyle: { width: "18%" },
            render: (pics) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="checkbox"
                        checked={getPicsStatusValue(pics) === "1"}
                        onChange={(event) => {
                            event.stopPropagation()
                            togglePicsStatus(pics)
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        title={`Tandai ${pics.name || pics.pics_name || "pics"} sebagai ${getPicsStatusValue(pics) === "1" ? "non-aktif" : "aktif"}`}
                    />
                    <DataTableStatus inline variant={getPicsStatusVariant(pics)}>
                        {getPicsStatusLabel(pics)}
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
            render: (pics) => (
                <div className="parent-action-buttons">
                    <ButtonEditPics
                        title="Edit"
                        aria-label={`Edit ${pics.name || pics.pics_name || "pics"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", pics)
                        }}
                    />
                    <ButtonDeletePics
                        title="Delete"
                        aria-label={`Delete ${pics.name || pics.pics_name || "pics"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("delete", pics)
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

    const handleDeleteConfirm = (deletedPics = selectedPics) => {
        const deletedPicsId = getPicsId(deletedPics)

        if (deletedPicsId) {
            setPicsRows((currentRows) =>
                currentRows.filter((pics) => getPicsId(pics) !== deletedPicsId),
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
        pageSizeOptions: PICS_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "Pics pagination",
        pageSizeAriaLabel: "Jumlah data pics per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data pics..."
        : errorMessage || "Belum ada data pics untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-filters" aria-label="Filter pics">
                    <FilterDropdownPics
                        className="parent-table-filter parent-table-filter--sort"
                        options={picsSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Date Desc"
                        searchable={false}
                        onChange={setSortValue}
                    />
                    {picsFilterConfig.map((filterConfig) => (
                        <FilterDropdownPics
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
                getRowId={(pics) => getPicsId(pics) ?? pics.code ?? pics.pics_code}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />

            <DialogEditPics
                key={`edit-pics-${getPicsId(selectedPics) ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Pics"
                title={`Edit ${selectedPicsName}`}
                pics={selectedPics}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeletePics
                key={`delete-pics-${getPicsId(selectedPics) ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Pics"
                title={`Delete ${selectedPicsName}`}
                pics={selectedPics}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />
        </div>
    )
}

export default DataTablePics
