import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteCategories from "../../../Dialog/dialog-categories/DialogDeleteCategories.jsx"
import DialogEditCategories from "../../../Dialog/dialog-categories/DialogEditCategories.jsx"
import DialogValidateStatusMaster from "../../../Dialog/dialog-master/DialogValidateStatusMaster.jsx"
import ButtonDeleteCategories from "../../../button/categories-buttons/ButtonDeleteCategories.jsx"
import ButtonEditCategories from "../../../button/categories-buttons/ButtonEditCategories.jsx"
import ButtonImportMaster from "../../../button/master-buttons/ButtonImportMaster.jsx"
import ButtonExportMaster from "../../../button/master-buttons/ButtonExportMaster.jsx"
import FilterDropdownCategories from "../../../dropdown/filter-categories/FilterDropdownCategories.jsx"
import { categoriesFilterConfig } from "../../../dropdown/filter-categories/FilterDropdownCategories.config.js"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_CATEGORIES_PAGE_SIZE = 50
const CATEGORIES_PAGE_SIZE_OPTIONS = [50, 100, 250]
const DEFAULT_CATEGORIES_SORT = "date-desc"
const categoriesSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
    { value: "name-asc", label: "Name Asc" },
    { value: "name-desc", label: "Name Desc" },
]

const defaultCategoriesFilters = categoriesFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)

function normalizeCategoriesRows(responseData) {
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

function getCategoriesId(categories) {
    return categories?.id ?? null
}

function getCategoriesStatusValue(categories) {
    if (categories?.is_active !== undefined && categories?.is_active !== null) {
        return Number(categories.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(categories?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

function getCategoriesStatusLabel(categories) {
    const statusValue = getCategoriesStatusValue(categories)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "-"
}

function getCategoriesStatusVariant(categories) {
    const statusValue = getCategoriesStatusValue(categories)

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

function renderCategoriesValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function getPrimaryCategoriesUser(categories) {
    const users = Array.isArray(categories?.users) ? categories.users : []

    if (users.length === 0) {
        return null
    }

    return users.find((entry) => Number(entry?.is_primary) === 1) ?? users[0]
}

function getCategoriesPicName(categories) {
    const primaryUser = getPrimaryCategoriesUser(categories)

    return primaryUser?.user?.name || categories?.pic_name || categories?.pic_code || "-"
}

function matchesSearch(categories, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        categories.detail_category,
        categories.sub_category,
        categories.main_category,
        categories.brand_category,
        getPrimaryCategoriesUser(categories)?.user?.name,
        categories.pic_name,
        categories.pic_code,
        getCategoriesStatusLabel(categories),
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

    rows.forEach((categories) => {
        const customOption = filterConfig.getOption?.(categories)

        if (customOption?.value) {
            uniqueOptions.set(String(customOption.value), {
                value: String(customOption.value),
                label: String(customOption.label ?? customOption.value),
            })
            return
        }

        const value = normalizeFilterValue(filterConfig.getValue(categories))

        if (value) {
            uniqueOptions.set(value, { value, label: value })
        }
    })

    const options = Array.from(uniqueOptions.values()).sort((firstOption, secondOption) =>
        firstOption.label.localeCompare(secondOption.label),
    )

    return [{ value: ALL_FILTER_VALUE, label: filterConfig.placeholder }, ...options]
}

function getCategoriesDateValue(categories) {
    const dateValue =
        categories.created_at ??
        categories.createdAt ??
        categories.updated_at ??
        categories.updatedAt ??
        categories.date ??
        categories.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortCategoriesRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstCategories, secondCategories) =>
                String(firstCategories.detail_category ?? "").localeCompare(
                    String(secondCategories.detail_category ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstCategories, secondCategories) => {
        const dateDifference =
            (getCategoriesDateValue(firstCategories) - getCategoriesDateValue(secondCategories)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstCategories.detail_category ?? "").localeCompare(
                String(secondCategories.detail_category ?? ""),
            ) * sortDirection
        )
    })
}

function matchesCategoriesFilters(categories, filters) {
    return categoriesFilterConfig.every((filterConfig) => {
        const selectedValue = filters[filterConfig.key]

        if (!selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return true
        }

        return normalizeFilterValue(filterConfig.getValue(categories)) === selectedValue
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
        header: "Detail Category",
        headerStyle: { width: "24%" },
        cellStyle: { width: "24%" },
        render: (categories) => (
            <DataTableIdentity
                title={categories.detail_category || "-"}
            />
        ),
    },
        {
        key: "sub_category",
        header: "Sub Category",
        headerStyle: { width: "14%" },
        cellStyle: { width: "14%" },
        render: (categories) => renderCategoriesValue(categories.sub_category),
    },
    {
        key: "main_category",
        header: "Main Category",
        headerStyle: { width: "14%" },
        cellStyle: { width: "14%" },
        render: (categories) => renderCategoriesValue(categories.main_category),
    },
    {
        key: "brand_category",
        header: "Brand Category",
        headerStyle: { width: "14%" },
        cellStyle: { width: "14%" },
        render: (categories) => renderCategoriesValue(categories.brand_category),
    },
    {
        key: "pic",
        header: "PIC",
        headerStyle: { width: "14%" },
        cellStyle: { width: "14%" },
        render: (categories) => renderCategoriesValue(getCategoriesPicName(categories)),
    },

]

function DataTableCategories({
    searchQuery = "",
    tableLabel = "Categories table",
    refreshKey = 0,
}) {
    const [categoriesRows, setCategoriesRows] = useState([])
    const [filters, setFilters] = useState(defaultCategoriesFilters)
    const [sortValue, setSortValue] = useState(DEFAULT_CATEGORIES_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_CATEGORIES_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedCategories, setSelectedCategories] = useState(null)
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
            categoriesFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(categoriesRows, filterConfig),
                }),
                {},
            ),
        [categoriesRows],
    )
    const filteredRows = useMemo(
        () =>
            categoriesRows.filter(
                (categories) => matchesSearch(categories, searchQuery) && matchesCategoriesFilters(categories, filters),
            ),
        [categoriesRows, filters, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortCategoriesRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedCategoriesName =
        selectedCategories?.detail_category || selectedCategories?.sub_category || "categories ini"

    useEffect(() => {
        let isMounted = true

        const loadCategories = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.categories.list()

                if (!isMounted) {
                    return
                }

                setCategoriesRows(normalizeCategoriesRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setCategoriesRows([])
                setErrorMessage(error?.message || "Gagal memuat data categories.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadCategories()

        return () => {
            isMounted = false
        }
    }, [refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedCategories(null)
    }

    const openActionDialog = (dialogType, categories) => {
        setSelectedCategories(categories)
        setActiveActionDialog(dialogType)
    }

    const handleConfirmStatusChange = async (categories, newStatus) => {
        const categoriesId = getCategoriesId(categories)

        await api.categories.updateStatus(categoriesId, newStatus)

        setCategoriesRows((currentRows) =>
            currentRows.map((row) =>
                getCategoriesId(row) === categoriesId
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
            headerStyle: { width: "12%" },
            cellStyle: { width: "12%" },
            render: (categories) => (
                <div className="item-table__status-cell" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label
                        className="users-table__toggle item-table__status-toggle"
                        onClick={(event) => event.stopPropagation()}
                        title={`Tandai ${categories.detail_category || categories.name || categories.category_name || "categories"} sebagai ${getCategoriesStatusValue(categories) === "1" ? "non-aktif" : "aktif"}`}
                    >
                        <input
                            type="checkbox"
                            checked={getCategoriesStatusValue(categories) === "1"}
                            onChange={() => openActionDialog("status", categories)}
                        />
                        <span className="users-table__toggle-track" aria-hidden="true" />
                        <span className="users-table__toggle-thumb" aria-hidden="true" />
                    </label>
                    <DataTableStatus inline variant={getCategoriesStatusVariant(categories)}>
                        {getCategoriesStatusLabel(categories)}
                    </DataTableStatus>
                </div>
            ),
        },
        {
            key: "action",
            header: "Action",
            headerClassName: "users-table__action-header",
            cellClassName: "users-table__action-cell",
            headerStyle: { width: "8%" },
            cellStyle: { width: "8%", whiteSpace: "nowrap" },
            render: (categories) => (
                <div className="parent-action-buttons">
                    <ButtonEditCategories
                        title="Edit"
                        aria-label={`Edit ${categories.name || categories.category_name || "categories"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", categories)
                        }}
                    />
                    <ButtonDeleteCategories
                        title="Delete"
                        aria-label={`Delete ${categories.name || categories.category_name || "categories"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("delete", categories)
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

    const handleDeleteConfirm = (deletedCategories = selectedCategories) => {
        const deletedCategoriesId = getCategoriesId(deletedCategories)

        if (deletedCategoriesId) {
            setCategoriesRows((currentRows) =>
                currentRows.filter((categories) => getCategoriesId(categories) !== deletedCategoriesId),
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
        pageSizeOptions: CATEGORIES_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "<",
        nextLabel: ">",
        circularButtons: true,
        ariaLabel: "Categories pagination",
        pageSizeAriaLabel: "Jumlah data categories per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data categories..."
        : errorMessage || "Belum ada data categories untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-actions">
                    <ButtonExportMaster
                        type="categories"
                        masterLabel="Category"
                        aria-label="Export category data"
                    />
                    <ButtonImportMaster
                        type="categories"
                        masterLabel="Category"
                        aria-label="Import category data"
                        onImported={() => setReloadKey((currentKey) => currentKey + 1)}
                    />
                </div>

                <div className="parent-table-filters" aria-label="Filter categories">
                    <FilterDropdownCategories
                        className="parent-table-filter parent-table-filter--sort"
                        options={categoriesSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Date Desc"
                        searchable={false}
                        onChange={setSortValue}
                    />
                    {categoriesFilterConfig.map((filterConfig) => (
                        <FilterDropdownCategories
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
                getRowId={(categories) => getCategoriesId(categories) ?? categories.detail_category}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />

            <DialogEditCategories
                key={`edit-categories-${getCategoriesId(selectedCategories) ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Categories"
                title={`Edit ${selectedCategoriesName}`}
                categories={selectedCategories}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeleteCategories
                key={`delete-categories-${getCategoriesId(selectedCategories) ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Categories"
                title={`Delete ${selectedCategoriesName}`}
                categories={selectedCategories}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />

            <DialogValidateStatusMaster
                key={`status-categories-${getCategoriesId(selectedCategories) ?? "empty"}`}
                isOpen={activeActionDialog === "status"}
                eyebrow="Ubah Status Categories"
                title="Konfirmasi Perubahan Status"
                entity={selectedCategories}
                displayName={selectedCategoriesName}
                onClose={closeActionDialog}
                onConfirm={handleConfirmStatusChange}
            />
        </div>
    )
}

export default DataTableCategories
