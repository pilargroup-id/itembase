import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteItem from "../../../dialog/dialog-item/DialogDeleteItem.jsx"
import DialogEditItem from "../../../dialog/dialog-item/DialogEditItem.jsx"
import ButtonDeleteItem from "../../../button/item-buttons/ButtonDeleteItem.jsx"
import ButtonEditItem from "../../../button/item-buttons/ButtonEditItem.jsx"
import FilterDropdownItem from "../../../dropdown/filter-item/FilterDropdownItem.jsx"
import { itemFilterConfig } from "../../../dropdown/filter-item/FilterDropdownItem.config.js"
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

function getItemStatusLabel(item) {
    return Number(item?.is_active) === 1 ? "active" : "inactive"
}

function getItemStatusVariant(item) {
    return Number(item?.is_active) === 1 ? "active" : "inactive"
}

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

function matchesSearch(item, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        item.item_code,
        item.barcode,
        item.item_name,
        item.item_kind,
        item.variant,
        getItemStatusLabel(item),
        item.parent?.parent_code,
        item.parent?.parent_name,
        item.parent?.brand?.name,
        item.parent?.category?.detail_category,
        item.parent?.category?.sub_category,
        item.parent?.category?.main_category,
        item.parent?.item_type?.name,
        item.parent?.port?.name,
        item.uom?.code,
        item.uom?.name,
        item.sku_status?.name,
        item.business_unit?.code,
        item.business_unit?.name,
        ...(item.channels ?? []).flatMap((channel) => [
            channel.channel_code,
            channel.channel_name,
        ]),
    ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery))
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

function getItemDateValue(item) {
    const dateValue =
        item.created_at ??
        item.createdAt ??
        item.updated_at ??
        item.updatedAt ??
        item.date ??
        item.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortItemRows(rows, sortValue) {
    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstItem, secondItem) => {
        const dateDifference =
            (getItemDateValue(firstItem) - getItemDateValue(secondItem)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstItem.item_code ?? "").localeCompare(String(secondItem.item_code ?? "")) *
            sortDirection
        )
    })
}

function matchesItemFilters(item, filters) {
    return itemFilterConfig.every((filterConfig) => {
        if (filterConfig.apiParam) {
            return true
        }

        const selectedValue = filters[filterConfig.key]

        if (!selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return true
        }

        return normalizeFilterValue(filterConfig.getValue(item)) === selectedValue
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
    const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [filterOptionRows, setFilterOptionRows] = useState([])
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [reloadKey, setReloadKey] = useState(0)
    const itemApiParams = useMemo(
        () => createItemApiParams(filters, searchQuery),
        [filters, searchQuery],
    )
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
    const optionSourceRows = filterOptionRows.length > 0 ? filterOptionRows : itemRows

    const filterOptions = useMemo(
        () =>
            itemFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(optionSourceRows, filterConfig),
                }),
                {},
            ),
        [optionSourceRows],
    )
    const filteredRows = useMemo(
        () =>
            itemRows.filter(
                (item) => matchesSearch(item, searchQuery) && matchesItemFilters(item, filters),
            ),
        [filters, itemRows, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortItemRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedItemName =
        selectedItem?.item_name || selectedItem?.item_code || selectedItem?.barcode || "item ini"
    const dialogItem = selectedItem ? { name: selectedItemName } : null

    useEffect(() => {
        let isMounted = true
        const controller = new AbortController()

        const loadFilterOptionRows = async () => {
            setIsLoadingFilterOptions(true)

            try {
                const response = await api.items.list({}, { signal: controller.signal })

                if (!isMounted) {
                    return
                }

                setFilterOptionRows(normalizeItemRows(response))
            } catch (error) {
                if (!isMounted || error?.name === "AbortError") {
                    return
                }

                setFilterOptionRows([])
            } finally {
                if (isMounted) {
                    setIsLoadingFilterOptions(false)
                }
            }
        }

        loadFilterOptionRows()

        return () => {
            isMounted = false
            controller.abort()
        }
    }, [refreshKey, reloadKey])

    useEffect(() => {
        let isMounted = true
        const controller = new AbortController()

        const loadItems = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.items.list(itemApiParams, { signal: controller.signal })

                if (!isMounted) {
                    return
                }

                setItemRows(normalizeItemRows(response))
            } catch (error) {
                if (!isMounted || error?.name === "AbortError") {
                    return
                }

                setItemRows([])
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
    }, [itemApiParams, refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedItem(null)
    }

    const openActionDialog = (dialogType, item) => {
        setSelectedItem(item)
        setActiveActionDialog(dialogType)
    }

    const toggleItemStatus = async (item) => {
        const itemId = item.id ?? item.item_code ?? item.barcode
        const currentStatus = Number(item.is_active) === 1 ? 1 : 0
        const newStatus = currentStatus === 1 ? 0 : 1
        const previousItemRows = [...itemRows]

        setItemRows((currentRows) =>
            currentRows.map((row) =>
                (row.id ?? row.item_code ?? row.barcode) === itemId
                    ? { ...row, is_active: newStatus }
                    : row,
            ),
        )

        try {
            await api.items.updateStatus(itemId, newStatus)
        } catch (error) {
            setItemRows(previousItemRows)
            setErrorMessage(error?.message || "Gagal mengubah status item.")
        }
    }

    const tableColumns = [
        ...columns.slice(0, 1),
        {
            key: "status",
            header: "Status",
            headerStyle: { width: "8%" },
            cellStyle: { width: "8%" },
            render: (item) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="checkbox"
                        checked={Number(item?.is_active) === 1}
                        onChange={(event) => {
                            event.stopPropagation()
                            toggleItemStatus(item)
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#18786e" }}
                        title={`Tandai ${item.item_name || item.item_code || "item"} sebagai ${Number(item?.is_active) === 1 ? "non-aktif" : "aktif"}`}
                    />
                    <DataTableStatus inline variant={getItemStatusVariant(item)}>
                        {getItemStatusLabel(item)}
                    </DataTableStatus>
                </div>
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
        ariaLabel: "Items pagination",
        pageSizeAriaLabel: "Jumlah data item per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data item..."
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
                        onChange={setSortValue}
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
                            emptyMessage={
                                isLoadingFilterOptions ? "Memuat opsi..." : filterConfig.emptyMessage
                            }
                            onChange={(nextValue) => handleFilterChange(filterConfig.key, nextValue)}
                        />
                    ))}
                </div>
            </div>

            <DataTable
                className="mtickets-table"
                rows={rows}
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
