import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteParent from "../../../Dialog/dialog-parent/DialogDeleteParent.jsx"
import DialogEditParent from "../../../Dialog/dialog-parent/DialogEditParent.jsx"
import ButtonDeleteParent from "../../../button/parents-buttons/ButtonDeleteParent.jsx"
import ButtonEditParent from "../../../button/parents-buttons/ButtonEditParent.jsx"
import FilterDropdownParent from "../../../dropdown/filter-parent/FilterDropdownParent.jsx"
import { parentFilterConfig } from "../../../dropdown/filter-parent/FilterDropdownParent.config.js"
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
const DEFAULT_PARENT_SORT = "date-desc"
const parentSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
]

const defaultParentFilters = parentFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)

function getParentStatusVariant(status) {
    const normalizedStatus = String(status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "active"
    }

    if (normalizedStatus === "inactive") {
        return "inactive"
    }

    return "pending"
}

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

function normalizeParentRows(responseData) {
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

function matchesSearch(parent, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        parent.parent_code,
        parent.parent_name,
        parent.item_name,
        parent.sub_brand,
        parent.status,
        parent.brand?.name,
        parent.category?.detail_category,
        parent.category?.sub_category,
        parent.category?.main_category,
        parent.category?.brand_category,
        parent.item_type?.name,
        parent.port?.name,
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

    const uniqueValues = Array.from(
        new Set(
            rows
                .map((parent) => normalizeFilterValue(filterConfig.getValue(parent)))
                .filter(Boolean),
        ),
    ).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue))

    return [
        { value: ALL_FILTER_VALUE, label: filterConfig.placeholder },
        ...uniqueValues.map((value) => ({ value, label: value })),
    ]
}

function getParentDateValue(parent) {
    const dateValue =
        parent.created_at ??
        parent.createdAt ??
        parent.updated_at ??
        parent.updatedAt ??
        parent.date ??
        parent.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortParentRows(rows, sortValue) {
    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstParent, secondParent) => {
        const dateDifference =
            (getParentDateValue(firstParent) - getParentDateValue(secondParent)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstParent.parent_code ?? "").localeCompare(
                String(secondParent.parent_code ?? ""),
            ) * sortDirection
        )
    })
}

function matchesParentFilters(parent, filters) {
    return parentFilterConfig.every((filterConfig) => {
        const selectedValue = filters[filterConfig.key]

        if (!selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return true
        }

        return normalizeFilterValue(filterConfig.getValue(parent)) === selectedValue
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
        header: "Parent Item",
        headerStyle: { width: "12%" },
        cellStyle: { width: "12%" },
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
        headerStyle: { width: "8%" },
        cellStyle: { width: "8%" },
        render: (parent) => renderParentValue(parent.brand?.name),
    },
    {
        key: "subBrand",
        header: "Sub Brand",
        headerStyle: { width: "8%" },
        cellStyle: { width: "8%" },
        render: (parent) => renderParentValue(parent.sub_brand),
    },
    {
        key: "mainCategory",
        header: "Main Category",
        headerStyle: { width: "10%" },
        cellStyle: { width: "10%" },
        render: (parent) => renderParentValue(parent.category?.main_category),
    },
    {
        key: "subCategory",
        header: "Sub Category",
        headerStyle: { width: "10%" },
        cellStyle: { width: "10%" },
        render: (parent) => renderParentValue(parent.category?.sub_category),
    },
    {
        key: "detailCategory",
        header: "Detail Category",
        headerStyle: { width: "10%" },
        cellStyle: { width: "10%" },
        render: (parent) => renderParentValue(parent.category?.detail_category),
    },
    {
        key: "brandCategory",
        header: "Brand Category",
        headerStyle: { width: "9%" },
        cellStyle: { width: "9%" },
        render: (parent) => renderParentValue(parent.category?.brand_category),
    },
    {
        key: "itemType",
        header: "Item Type",
        headerStyle: { width: "7%" },
        cellStyle: { width: "7%" },
        render: (parent) => renderParentValue(parent.item_type?.name),
    },
    {
        key: "port",
        header: "Port",
        headerStyle: { width: "6%" },
        cellStyle: { width: "6%" },
        render: (parent) => renderParentValue(parent.port?.name),
    },
]

function DataTableParents({
    searchQuery = "",
    tableLabel = "Item Parents table",
    refreshKey = 0,
}) {
    const [parentRows, setParentRows] = useState([])
    const [filters, setFilters] = useState(defaultParentFilters)
    const [sortValue, setSortValue] = useState(DEFAULT_PARENT_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedParent, setSelectedParent] = useState(null)
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
            parentFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(parentRows, filterConfig),
                }),
                {},
            ),
        [parentRows],
    )
    const filteredRows = useMemo(
        () =>
            parentRows.filter(
                (parent) =>
                    matchesSearch(parent, searchQuery) && matchesParentFilters(parent, filters),
            ),
        [filters, parentRows, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortParentRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedParentName =
        selectedParent?.parent_name || selectedParent?.item_name || selectedParent?.parent_code || "item ini"
    const dialogParent = selectedParent ? { name: selectedParentName } : null

    useEffect(() => {
        let isMounted = true

        const loadItemParents = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.itemParents.list()

                if (!isMounted) {
                    return
                }

                setParentRows(normalizeParentRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setParentRows([])
                setErrorMessage(error?.message || "Gagal memuat data item parent.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadItemParents()

        return () => {
            isMounted = false
        }
    }, [refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedParent(null)
    }

    const openActionDialog = (dialogType, parent) => {
        setSelectedParent(parent)
        setActiveActionDialog(dialogType)
    }

    const toggleParentStatus = async (parent) => {
        const parentId = parent.id ?? parent.pic_id ?? parent.parent_code
        const currentStatus = String(parent.status ?? "").toLowerCase()
        const newStatus = currentStatus === "active" ? "inactive" : "active"
        const previousParentRows = [...parentRows]

        setParentRows((currentRows) =>
            currentRows.map((row) =>
                (row.id ?? row.pic_id ?? row.parent_code) === parentId
                    ? { ...row, status: newStatus }
                    : row,
            ),
        )

        try {
            await api.itemParents.updateStatus(parentId, newStatus)
        } catch (error) {
            setParentRows(previousParentRows)
            setErrorMessage(error?.message || "Gagal mengubah status item parent.")
        }
    }

    const tableColumns = [
        ...columns.slice(0, 1),
        {
            key: "itemName",
            header: "Item Name",
            headerStyle: { width: "13%" },
            cellStyle: { width: "13%" },
            render: (parent) => (
                <DataTableIdentity
                    title={parent.item_name || "-"}
                    subtitle={
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                                type="checkbox"
                                checked={String(parent.status ?? "").toLowerCase() === "active"}
                                onChange={(event) => {
                                    event.stopPropagation()
                                    toggleParentStatus(parent)
                                }}
                                style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#18786e" }}
                                title={`Tandai ${parent.item_name || "parent"} sebagai ${String(parent.status ?? "").toLowerCase() === "active" ? "non-aktif" : "aktif"}`}
                            />
                            <DataTableStatus inline variant={getParentStatusVariant(parent.status)}>
                                {parent.status || "-"}
                            </DataTableStatus>
                        </div>
                    }
                />
            ),
        },
        ...columns.slice(1),
        {
            key: "action",
            header: "Action",
            headerClassName: "users-table__action-header",
            cellClassName: "users-table__action-cell",
            headerStyle: { width: "7%" },
            cellStyle: { width: "7%", whiteSpace: "nowrap" },
            render: (parent) => (
                <div className="parent-action-buttons">
                    <ButtonEditParent
                        title="Edit"
                        aria-label={`Edit ${parent.parent_name || parent.item_name || "item parent"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", parent)
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

    const handleDeleteConfirm = (deletedParent = selectedParent) => {
        if (deletedParent?.id) {
            setParentRows((currentRows) =>
                currentRows.filter((parent) => parent.id !== deletedParent.id),
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
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "Item parents pagination",
        pageSizeAriaLabel: "Jumlah data item parent per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data item parent..."
        : errorMessage || "Belum ada data item parent untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-filters" aria-label="Filter item parent">
                    <FilterDropdownParent
                        className="parent-table-filter parent-table-filter--sort"
                        options={parentSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Date Desc"
                        searchable={false}
                        onChange={setSortValue}
                    />
                    {parentFilterConfig.map((filterConfig) => (
                        <FilterDropdownParent
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
                getRowId={(parent) => parent.id ?? parent.pic_id ?? parent.parent_code}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
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
        </div>
    )
}

export default DataTableParents
