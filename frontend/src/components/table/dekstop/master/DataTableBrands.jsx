import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteBrand from "../../../Dialog/dialog-brands/DialogDeleteBrand.jsx"
import DialogEditBrand from "../../../Dialog/dialog-brands/DialogEditBrand.jsx"
import ButtonDeleteBrand from "../../../button/brands-buttons/ButtonDeleteBrand.jsx"
import ButtonEditBrand from "../../../button/brands-buttons/ButtonEditBrand.jsx"
import FilterDropdownBrand from "../../../dropdown/filter-brands/FilterDropdownBrand.jsx"
import { brandFilterConfig } from "../../../dropdown/filter-brands/FilterDropdownBrand.config.js"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_BRAND_PAGE_SIZE = 25
const BRAND_PAGE_SIZE_OPTIONS = [25, 50, 100]
const DEFAULT_BRAND_SORT = "date-desc"
const brandSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
    { value: "name-asc", label: "Name Asc" },
    { value: "name-desc", label: "Name Desc" },
]

const defaultBrandFilters = brandFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)

function normalizeBrandRows(responseData) {
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

function getBrandId(brand) {
    return brand?.id ?? brand?.brand_id ?? null
}

function getBrandStatusValue(brand) {
    if (brand?.is_active !== undefined && brand?.is_active !== null) {
        return Number(brand.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(brand?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

function getBrandStatusLabel(brand) {
    const statusValue = getBrandStatusValue(brand)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "-"
}

function getBrandStatusVariant(brand) {
    const statusValue = getBrandStatusValue(brand)

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

function renderBrandValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function matchesSearch(brand, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        brand.code,
        brand.brand_code,
        brand.name,
        brand.brand_name,
        getBrandStatusLabel(brand),
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

    rows.forEach((brand) => {
        const customOption = filterConfig.getOption?.(brand)

        if (customOption?.value) {
            uniqueOptions.set(String(customOption.value), {
                value: String(customOption.value),
                label: String(customOption.label ?? customOption.value),
            })
            return
        }

        const value = normalizeFilterValue(filterConfig.getValue(brand))

        if (value) {
            uniqueOptions.set(value, { value, label: value })
        }
    })

    const options = Array.from(uniqueOptions.values()).sort((firstOption, secondOption) =>
        firstOption.label.localeCompare(secondOption.label),
    )

    return [{ value: ALL_FILTER_VALUE, label: filterConfig.placeholder }, ...options]
}

function getBrandDateValue(brand) {
    const dateValue =
        brand.created_at ??
        brand.createdAt ??
        brand.updated_at ??
        brand.updatedAt ??
        brand.date ??
        brand.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortBrandRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstBrand, secondBrand) =>
                String(firstBrand.name ?? firstBrand.brand_name ?? "").localeCompare(
                    String(secondBrand.name ?? secondBrand.brand_name ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstBrand, secondBrand) => {
        const dateDifference =
            (getBrandDateValue(firstBrand) - getBrandDateValue(secondBrand)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstBrand.code ?? firstBrand.brand_code ?? "").localeCompare(
                String(secondBrand.code ?? secondBrand.brand_code ?? ""),
            ) * sortDirection
        )
    })
}

function matchesBrandFilters(brand, filters) {
    return brandFilterConfig.every((filterConfig) => {
        const selectedValue = filters[filterConfig.key]

        if (!selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return true
        }

        return normalizeFilterValue(filterConfig.getValue(brand)) === selectedValue
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
        header: "Brand",
        headerStyle: { width: "36%" },
        cellStyle: { width: "36%" },
        render: (brand) => (
            <DataTableIdentity
                title={brand.name || brand.brand_name || "-"}
                subtitle={brand.code || brand.brand_code || "-"}
            />
        ),
    },
    {
        key: "code",
        header: "Code",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (brand) => renderBrandValue(brand.code || brand.brand_code),
    },
]

function DataTableBrands({
    searchQuery = "",
    tableLabel = "Brands table",
    refreshKey = 0,
}) {
    const [brandRows, setBrandRows] = useState([])
    const [filters, setFilters] = useState(defaultBrandFilters)
    const [sortValue, setSortValue] = useState(DEFAULT_BRAND_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_BRAND_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedBrand, setSelectedBrand] = useState(null)
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
            brandFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(brandRows, filterConfig),
                }),
                {},
            ),
        [brandRows],
    )
    const filteredRows = useMemo(
        () =>
            brandRows.filter(
                (brand) => matchesSearch(brand, searchQuery) && matchesBrandFilters(brand, filters),
            ),
        [brandRows, filters, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortBrandRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedBrandName =
        selectedBrand?.name || selectedBrand?.brand_name || selectedBrand?.code || "brand ini"

    useEffect(() => {
        let isMounted = true

        const loadBrands = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.brands.list()

                if (!isMounted) {
                    return
                }

                setBrandRows(normalizeBrandRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setBrandRows([])
                setErrorMessage(error?.message || "Gagal memuat data brand.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadBrands()

        return () => {
            isMounted = false
        }
    }, [refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedBrand(null)
    }

    const openActionDialog = (dialogType, brand) => {
        setSelectedBrand(brand)
        setActiveActionDialog(dialogType)
    }

    const toggleBrandStatus = async (brand) => {
        const brandId = getBrandId(brand)
        const currentStatus = getBrandStatusValue(brand) === "1" ? 1 : 0
        const newStatus = currentStatus === 1 ? 0 : 1
        const previousBrandRows = [...brandRows]

        setBrandRows((currentRows) =>
            currentRows.map((row) =>
                getBrandId(row) === brandId
                    ? { ...row, is_active: newStatus, status: newStatus === 1 ? "active" : "inactive" }
                    : row,
            ),
        )

        try {
            await api.brands.updateStatus(brandId, newStatus)
        } catch (error) {
            setBrandRows(previousBrandRows)
            setErrorMessage(error?.message || "Gagal mengubah status brand.")
        }
    }

    const tableColumns = [
        ...columns,
        {
            key: "status",
            header: "Status",
            headerStyle: { width: "18%" },
            cellStyle: { width: "18%" },
            render: (brand) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="checkbox"
                        checked={getBrandStatusValue(brand) === "1"}
                        onChange={(event) => {
                            event.stopPropagation()
                            toggleBrandStatus(brand)
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        title={`Tandai ${brand.name || brand.brand_name || "brand"} sebagai ${getBrandStatusValue(brand) === "1" ? "non-aktif" : "aktif"}`}
                    />
                    <DataTableStatus inline variant={getBrandStatusVariant(brand)}>
                        {getBrandStatusLabel(brand)}
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
            render: (brand) => (
                <div className="parent-action-buttons">
                    <ButtonEditBrand
                        title="Edit"
                        aria-label={`Edit ${brand.name || brand.brand_name || "brand"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", brand)
                        }}
                    />
                    <ButtonDeleteBrand
                        title="Delete"
                        aria-label={`Delete ${brand.name || brand.brand_name || "brand"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("delete", brand)
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

    const handleDeleteConfirm = (deletedBrand = selectedBrand) => {
        const deletedBrandId = getBrandId(deletedBrand)

        if (deletedBrandId) {
            setBrandRows((currentRows) =>
                currentRows.filter((brand) => getBrandId(brand) !== deletedBrandId),
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
        pageSizeOptions: BRAND_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "Brands pagination",
        pageSizeAriaLabel: "Jumlah data brand per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data brand..."
        : errorMessage || "Belum ada data brand untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-filters" aria-label="Filter brand">
                    <FilterDropdownBrand
                        className="parent-table-filter parent-table-filter--sort"
                        options={brandSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Date Desc"
                        searchable={false}
                        onChange={setSortValue}
                    />
                    {brandFilterConfig.map((filterConfig) => (
                        <FilterDropdownBrand
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
                getRowId={(brand) => getBrandId(brand) ?? brand.code ?? brand.brand_code}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />

            <DialogEditBrand
                key={`edit-brand-${getBrandId(selectedBrand) ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Brand"
                title={`Edit ${selectedBrandName}`}
                brand={selectedBrand}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeleteBrand
                key={`delete-brand-${getBrandId(selectedBrand) ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Brand"
                title={`Delete ${selectedBrandName}`}
                brand={selectedBrand}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />
        </div>
    )
}

export default DataTableBrands
