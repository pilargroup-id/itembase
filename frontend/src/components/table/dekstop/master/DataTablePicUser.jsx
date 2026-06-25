import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeletePicUser from "../../../Dialog/dialog-pic-users/DialogDeletePicUser.jsx"
import DialogEditPicUser from "../../../Dialog/dialog-pic-users/DialogEditPicUser.jsx"
import ButtonDeletePicUser from "../../../button/pic-users-buttons/ButtonDeletePicUser.jsx"
import ButtonEditPicUser from "../../../button/pic-users-buttons/ButtonEditPicUser.jsx"
import FilterDropdownPicUser from "../../../dropdown/filter-pic-users/FilterDropdownPicUser.jsx"
import { picUserFilterConfig } from "../../../dropdown/filter-pic-users/FilterDropdownPicUser.config.js"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_PIC_USER_PAGE_SIZE = 25
const PIC_USER_PAGE_SIZE_OPTIONS = [25, 50, 100]
const DEFAULT_PIC_USER_SORT = "date-desc"
const picUserSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
    { value: "name-asc", label: "Name Asc" },
    { value: "name-desc", label: "Name Desc" },
]

const defaultPicUserFilters = picUserFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)

function normalizePicUserRows(responseData) {
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

function getPicUserId(picUser) {
    return picUser?.id ?? null
}

function getPicUserStatusValue(picUser) {
    if (picUser?.is_active !== undefined && picUser?.is_active !== null) {
        return Number(picUser.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(picUser?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

function getPicUserStatusLabel(picUser) {
    const statusValue = getPicUserStatusValue(picUser)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "-"
}

function getPicUserStatusVariant(picUser) {
    const statusValue = getPicUserStatusValue(picUser)

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

function renderPicUserValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function matchesSearch(picUser, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        picUser.pic_code,
        picUser.pic_name,
        picUser.central_user_id,
        getPicUserStatusLabel(picUser),
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

    rows.forEach((picUser) => {
        const customOption = filterConfig.getOption?.(picUser)

        if (customOption?.value) {
            uniqueOptions.set(String(customOption.value), {
                value: String(customOption.value),
                label: String(customOption.label ?? customOption.value),
            })
            return
        }

        const value = normalizeFilterValue(filterConfig.getValue(picUser))

        if (value) {
            uniqueOptions.set(value, { value, label: value })
        }
    })

    const options = Array.from(uniqueOptions.values()).sort((firstOption, secondOption) =>
        firstOption.label.localeCompare(secondOption.label),
    )

    return [{ value: ALL_FILTER_VALUE, label: filterConfig.placeholder }, ...options]
}

function getPicUserDateValue(picUser) {
    const dateValue =
        picUser.created_at ??
        picUser.createdAt ??
        picUser.updated_at ??
        picUser.updatedAt ??
        picUser.date ??
        picUser.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortPicUserRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstPicUser, secondPicUser) =>
                String(firstPicUser.pic_name ?? "").localeCompare(
                    String(secondPicUser.pic_name ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstPicUser, secondPicUser) => {
        const dateDifference =
            (getPicUserDateValue(firstPicUser) - getPicUserDateValue(secondPicUser)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstPicUser.pic_code ?? "").localeCompare(
                String(secondPicUser.pic_code ?? ""),
            ) * sortDirection
        )
    })
}

function matchesPicUserFilters(picUser, filters) {
    return picUserFilterConfig.every((filterConfig) => {
        const selectedValue = filters[filterConfig.key]

        if (!selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return true
        }

        return normalizeFilterValue(filterConfig.getValue(picUser)) === selectedValue
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
        header: "PIC User",
        headerStyle: { width: "36%" },
        cellStyle: { width: "36%" },
        render: (picUser) => (
            <DataTableIdentity
                title={picUser.pic_name || "-"}
                subtitle={picUser.pic_code || "-"}
            />
        ),
    },
    {
        key: "central_user_id",
        header: "User ID",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (picUser) => renderPicUserValue(picUser.central_user_id),
    },
    {
        key: "status",
        header: "Status",
        headerStyle: { width: "18%" },
        cellStyle: { width: "18%" },
        render: (picUser) => (
            <DataTableStatus inline variant={getPicUserStatusVariant(picUser)}>
                {getPicUserStatusLabel(picUser)}
            </DataTableStatus>
        ),
    },
]

function DataTablePicUser({
    searchQuery = "",
    tableLabel = "Pic User table",
    refreshKey = 0,
}) {
    const [picUserRows, setPicUserRows] = useState([])
    const [filters, setFilters] = useState(defaultPicUserFilters)
    const [sortValue, setSortValue] = useState(DEFAULT_PIC_USER_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_PIC_USER_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedPicUser, setSelectedPicUser] = useState(null)
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
            picUserFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(picUserRows, filterConfig),
                }),
                {},
            ),
        [picUserRows],
    )
    const filteredRows = useMemo(
        () =>
            picUserRows.filter(
                (picUser) => matchesSearch(picUser, searchQuery) && matchesPicUserFilters(picUser, filters),
            ),
        [picUserRows, filters, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortPicUserRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedPicUserName =
        selectedPicUser?.pic_name || selectedPicUser?.pic_code || selectedPicUser?.central_user_id || "pic user ini"

    useEffect(() => {
        let isMounted = true

        const loadPicUsers = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.picUsers.list()

                if (!isMounted) {
                    return
                }

                setPicUserRows(normalizePicUserRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setPicUserRows([])
                setErrorMessage(error?.message || "Gagal memuat data pic user.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadPicUsers()

        return () => {
            isMounted = false
        }
    }, [refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedPicUser(null)
    }

    const openActionDialog = (dialogType, picUser) => {
        setSelectedPicUser(picUser)
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
            render: (picUser) => (
                <div className="parent-action-buttons">
                    <ButtonEditPicUser
                        title="Edit"
                        aria-label={`Edit ${picUser.pic_name || picUser.pic_code || "pic user"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", picUser)
                        }}
                    />
                    <ButtonDeletePicUser
                        title="Delete"
                        aria-label={`Delete ${picUser.pic_name || picUser.pic_code || "pic user"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("delete", picUser)
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

    const handleDeleteConfirm = (deletedPicUser = selectedPicUser) => {
        const deletedPicUserId = getPicUserId(deletedPicUser)

        if (deletedPicUserId) {
            setPicUserRows((currentRows) =>
                currentRows.filter((picUser) => getPicUserId(picUser) !== deletedPicUserId),
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
        pageSizeOptions: PIC_USER_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "Pic Users pagination",
        pageSizeAriaLabel: "Jumlah data pic user per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data pic user..."
        : errorMessage || "Belum ada data pic user untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-filters" aria-label="Filter pic user">
                    <FilterDropdownPicUser
                        className="parent-table-filter parent-table-filter--sort"
                        options={picUserSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Date Desc"
                        searchable={false}
                        onChange={setSortValue}
                    />
                    {picUserFilterConfig.map((filterConfig) => (
                        <FilterDropdownPicUser
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
                getRowId={(picUser) => getPicUserId(picUser) ?? picUser.pic_code ?? picUser.central_user_id}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />

            <DialogEditPicUser
                key={`edit-pic-user-${getPicUserId(selectedPicUser) ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Pic User"
                title={`Edit ${selectedPicUserName}`}
                picUser={selectedPicUser}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeletePicUser
                key={`delete-pic-user-${getPicUserId(selectedPicUser) ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Pic User"
                title={`Delete ${selectedPicUserName}`}
                picUser={selectedPicUser}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />
        </div>
    )
}

export default DataTablePicUser
