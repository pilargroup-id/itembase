import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteType from "../../../Dialog/dialog-types/DialogDeleteType.jsx"
import DialogEditType from "../../../Dialog/dialog-types/DialogEditType.jsx"
import ButtonDeleteType from "../../../button/Types-buttons/ButtonDeleteType.jsx"
import ButtonEditType from "../../../button/Types-buttons/ButtonEditType.jsx"
import FilterDropdownType from "../../../dropdown/filter-types/FilterDropdownType.jsx"
import { TypeFilterConfig } from "../../../dropdown/filter-types/FilterDropdownType.config.js"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_TYPE_PAGE_SIZE = 25
const TYPE_PAGE_SIZE_OPTIONS = [25, 50, 100]
const DEFAULT_TYPE_SORT = "date-desc"
const typeSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
    { value: "name-asc", label: "Name Asc" },
    { value: "name-desc", label: "Name Desc" },
]

const defaultTypeFilters = TypeFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)

function normalizeTypeRows(responseData) {
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

function getTypeId(Type) {
    return Type?.id ?? Type?.type_id ?? null
}

function getTypeStatusValue(Type) {
    if (Type?.is_active !== undefined && Type?.is_active !== null) {
        return Number(Type.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(Type?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

function getTypeStatusLabel(Type) {
    const statusValue = getTypeStatusValue(Type)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "-"
}

function getTypeStatusVariant(Type) {
    const statusValue = getTypeStatusValue(Type)

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

function renderTypeValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function matchesSearch(Type, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        Type.code,
        Type.Type_code,
        Type.name,
        Type.Type_name,
        getTypeStatusLabel(Type),
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

    rows.forEach((Type) => {
        const customOption = filterConfig.getOption?.(Type)

        if (customOption?.value) {
            uniqueOptions.set(String(customOption.value), {
                value: String(customOption.value),
                label: String(customOption.label ?? customOption.value),
            })
            return
        }

        const value = normalizeFilterValue(filterConfig.getValue(Type))

        if (value) {
            uniqueOptions.set(value, { value, label: value })
        }
    })

    const options = Array.from(uniqueOptions.values()).sort((firstOption, secondOption) =>
        firstOption.label.localeCompare(secondOption.label),
    )

    return [{ value: ALL_FILTER_VALUE, label: filterConfig.placeholder }, ...options]
}

function getTypeDateValue(Type) {
    const dateValue =
        Type.created_at ??
        Type.createdAt ??
        Type.updated_at ??
        Type.updatedAt ??
        Type.date ??
        Type.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortTypeRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstType, secondType) =>
                String(firstType.name ?? firstType.Type_name ?? "").localeCompare(
                    String(secondType.name ?? secondType.Type_name ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstType, secondType) => {
        const dateDifference =
            (getTypeDateValue(firstType) - getTypeDateValue(secondType)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstType.code ?? firstType.Type_code ?? "").localeCompare(
                String(secondType.code ?? secondType.Type_code ?? ""),
            ) * sortDirection
        )
    })
}

function matchesTypeFilters(type, filters) {
    return TypeFilterConfig.every((filterConfig) => {
        const selectedValue = filters[filterConfig.key]

        if (!selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return true
        }

        return normalizeFilterValue(filterConfig.getValue(type)) === selectedValue
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
        header: "Type Item",
        headerStyle: { width: "36%" },
        cellStyle: { width: "36%" },
        render: (Type) => (
            <DataTableIdentity
                title={Type.name || Type.Type_name || "-"}
                subtitle={Type.code || Type.Type_code || "-"}
            />
        ),
    },
    {
        key: "code",
        header: "Code",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (Type) => renderTypeValue(Type.code || Type.Type_code),
    },
    {
        key: "status",
        header: "Status",
        headerStyle: { width: "18%" },
        cellStyle: { width: "18%" },
        render: (Type) => (
            <DataTableStatus inline variant={getTypeStatusVariant(Type)}>
                {getTypeStatusLabel(Type)}
            </DataTableStatus>
        ),
    },
]

function DataTableType({
    searchQuery = "",
    tableLabel = "Types table",
    refreshKey = 0,
}) {
    const [TypeRows, setTypeRows] = useState([])
    const [filters, setFilters] = useState(defaultTypeFilters)
    const [sortValue, setSortValue] = useState(DEFAULT_TYPE_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_TYPE_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedType, setSelectedType] = useState(null)
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
            TypeFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(TypeRows, filterConfig),
                }),
                {},
            ),
        [TypeRows],
    )
    const filteredRows = useMemo(
        () =>
            TypeRows.filter(
                (Type) => matchesSearch(Type, searchQuery) && matchesTypeFilters(Type, filters),
            ),
        [TypeRows, filters, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortTypeRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedTypeName =
        selectedType?.name || selectedType?.Type_name || selectedType?.code || "Type ini"

    useEffect(() => {
        let isMounted = true

        const loadTypes = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.itemTypes.list()

                if (!isMounted) {
                    return
                }

                setTypeRows(normalizeTypeRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setTypeRows([])
                setErrorMessage(error?.message || "Gagal memuat data Type.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadTypes()

        return () => {
            isMounted = false
        }
    }, [refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedType(null)
    }

    const openActionDialog = (dialogType, Type) => {
        setSelectedType(Type)
        setActiveActionDialog(dialogType)
    }

    const tableColumns = [
        ...columns,
        {
            key: "action",
            header: "Action",
            headerClassName: "users-table__action-header",
            cellClassName: "users-table__action-cell",
            headerStyle: { width: "24%" },
            cellStyle: { width: "24%", whiteSpace: "nowrap" },
            render: (Type) => (
                <div className="parent-action-buttons">
                    <ButtonEditType
                        title="Edit"
                        aria-label={`Edit ${Type.name || Type.Type_name || "Type"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", Type)
                        }}
                    />
                    <ButtonDeleteType
                        title="Delete"
                        aria-label={`Delete ${Type.name || Type.Type_name || "Type"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("delete", Type)
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

    const handleDeleteConfirm = (deletedType = selectedType) => {
        const deletedTypeId = getTypeId(deletedType)

        if (deletedTypeId) {
            setTypeRows((currentRows) =>
                currentRows.filter((Type) => getTypeId(Type) !== deletedTypeId),
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
        pageSizeOptions: TYPE_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "Types pagination",
        pageSizeAriaLabel: "Jumlah data Type per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data Type..."
        : errorMessage || "Belum ada data Type untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-filters" aria-label="Filter Type">
                    <FilterDropdownType
                        className="parent-table-filter parent-table-filter--sort"
                        options={typeSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Date Desc"
                        searchable={false}
                        onChange={setSortValue}
                    />
                    {TypeFilterConfig.map((filterConfig) => (
                        <FilterDropdownType
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
                getRowId={(Type) => getTypeId(Type) ?? Type.code ?? Type.Type_code}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />

            <DialogEditType
                key={`edit-Type-${getTypeId(selectedType) ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Type"
                title={`Edit ${selectedTypeName}`}
                Type={selectedType}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeleteType
                key={`delete-Type-${getTypeId(selectedType) ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Type"
                title={`Delete ${selectedTypeName}`}
                Type={selectedType}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />
        </div>
    )
}

export default DataTableType
