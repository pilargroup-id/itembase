import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteItem from "../../../Dialog/dialog-item/DialogDeleteItem.jsx"
import DialogEditItem from "../../../Dialog/dialog-item/DialogEditItem.jsx"
import ButtonEditItem from "../../../button/item-buttons/ButtonEditItem.jsx"
import FilterDropdownItem from "../../../dropdown/filter-item/FilterDropdownItem.jsx"
import { itemFilterConfig } from "../../../dropdown/filter-item/FilterDropdownItem.config.js"
import DataTable, {
    DataTableIdentity,
} from "../DataTable.jsx"
import {
    DEFAULT_PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
    getPaginationItems,
} from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_ITEM_SORT = "date-desc"
const itemSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
]

const defaultItemFilters = itemFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)

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

function formatItemChannels(item) {
    if (!Array.isArray(item?.channels) || item.channels.length === 0) {
        return "-"
    }

    return item.channels
        .map((channel) =>
            formatDisplayValue(
                channel.channel_code ??
                    channel.channel_name,
            ),
        )
        .filter((value) => value !== "-")
        .join(", ") || "-"
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
    const params = {}

    itemFilterConfig.forEach((filterConfig) => {
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

    return {
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
        key: "kind",
        header: "Kind",
        headerStyle: { width: "7%" },
        cellStyle: { width: "7%" },
        render: (item) => renderItemValue(item.item_kind),
    },
    {
        key: "parent",
        header: "Parent",
        headerStyle: { width: "13%" },
        cellStyle: { width: "13%" },
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
        render: (item) => (
            <DataTableIdentity
                title={item.parent?.category?.detail_category || "-"}
                subtitle={`PIC \u2014 ${item.parent?.category?.pic_name || item.parent?.category?.pic_code || "-"}`}
            />
        ),
    },
    {
        key: "skuStatus",
        header: "SKU Status",
        headerStyle: { width: "9%" },
        cellStyle: { width: "9%" },
        render: (item) => renderItemValue(item.sku_status?.name),
    },
    {
        key: "businessUnit",
        header: "BU",
        headerStyle: { width: "6%" },
        cellStyle: { width: "6%" },
        render: (item) => renderItemValue(item.business_unit?.code ?? item.business_unit?.name),
    },
    {
        key: "channels",
        header: "Channel",
        headerStyle: { width: "8%" },
        cellStyle: { width: "8%" },
        render: (item) => renderItemValue(formatItemChannels(item)),
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
        headerStyle: { width: "7%" },
        cellStyle: { width: "7%" },
        render: (item) => renderItemValue(formatNumberValue(item.qty_per_pack)),
    },
    {
        key: "dimension",
        header: "Dimension",
        headerStyle: { width: "9%" },
        cellStyle: { width: "9%" },
        render: (item) =>
            renderItemValue(
                `${formatNumberValue(item.height)} x ${formatNumberValue(item.width)} x ${formatNumberValue(item.depth)}`,
            ),
    },
    {
        key: "createdBy",
        header: "Created By",
        headerStyle: { width: "8%" },
        cellStyle: { width: "8%" },
        render: (item) => renderItemValue(item.created_by?.name || item.created_by?.username || item.created_by),
    },
]

function DataTableItem({
    searchQuery = "",
    tableLabel = "Items table",
    refreshKey = 0,
}) {
    const [itemRows, setItemRows] = useState([])
    const [filters, setFilters] = useState(defaultItemFilters)
    const [sortValue, setSortValue] = useState(DEFAULT_ITEM_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
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
        selectedItem?.item_name || selectedItem?.item_code || selectedItem?.barcode || "item ini"
    const dialogItem = selectedItem ? { name: selectedItemName } : null

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
                setErrorMessage(error?.message || "Gagal memuat data item.")
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

    const openActionDialog = (dialogType, item) => {
        setSelectedItem(item)
        setActiveActionDialog(dialogType)
    }

    const tableColumns = [
        ...columns,
        {
            key: "action",
            header: "Action",
            headerClassName: "users-table__action-header",
            cellClassName: "users-table__action-cell",
            headerStyle: { width: "7%" },
            cellStyle: { width: "7%", whiteSpace: "nowrap" },
            render: (item) => (
                <div className="parent-action-buttons">
                    <ButtonEditItem
                        title="Edit"
                        aria-label={`Edit ${item.item_name || item.item_code || "item"}`}
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

    const handleDeleteConfirm = (deletedItem = selectedItem) => {
        if (deletedItem?.id) {
            setItemRows((currentRows) =>
                currentRows.map((item) =>
                    item.id === deletedItem.id ? { ...item, is_active: 0 } : item,
                ),
            )
        }

        closeActionDialog()
    }

    const handleFilterChange = (filterKey, nextValue) => {
        if (filters[filterKey] === nextValue) {
            return
        }

        setFilters((currentFilters) => ({
            ...currentFilters,
            [filterKey]: nextValue,
        }))
    }

    const handleSortChange = (nextSortValue) => {
        if (nextSortValue === sortValue) {
            return
        }

        setSortValue(nextSortValue)
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

    const loadingPageMessage = `Memuat data item halaman ${currentPage}...`
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
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "Items pagination",
        pageSizeAriaLabel: "Jumlah data item per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? loadingPageMessage
        : errorMessage || "Belum ada data item untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-filters" aria-label="Filter item">
                    <FilterDropdownItem
                        className="parent-table-filter parent-table-filter--sort"
                        options={itemSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Date Desc"
                        searchable={false}
                        onChange={handleSortChange}
                    />
                    {itemFilterConfig.map((filterConfig) => (
                        <FilterDropdownItem
                            key={filterConfig.key}
                            className="parent-table-filter"
                            options={filterOptions[filterConfig.key]}
                            value={filters[filterConfig.key]}
                            label={filterConfig.label}
                            placeholder={filterConfig.placeholder}
                            searchPlaceholder={filterConfig.searchPlaceholder}
                            emptyMessage={isLoading ? "Memuat opsi..." : filterConfig.emptyMessage}
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

            <DialogEditItem
                key={`edit-item-${selectedItem?.id ?? selectedItem?.item_code ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Item"
                title={`Edit ${selectedItemName}`}
                item={selectedItem}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeleteItem
                key={`delete-item-${selectedItem?.id ?? selectedItem?.item_code ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Item"
                title={`Delete ${selectedItemName}`}
                item={selectedItem}
                user={dialogItem}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />
        </div>
    )
}

export default DataTableItem
