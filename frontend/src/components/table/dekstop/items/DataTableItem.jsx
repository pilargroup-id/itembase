import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import FormControl from "@mui/material/FormControl"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"

import api from "../../../../services/api.js"
import { useAlertAction } from "../../../alert/alert-action/AlertActionContext.jsx"

import DialogDeleteItem from "../../../Dialog/dialog-item/DialogDeleteItem.jsx"
import DialogEditItem from "../../../Dialog/dialog-item/DialogEditItem.jsx"
import DialogFilterItem from "../../../Dialog/dialog-item/DialogFilterItem.jsx"
import DialogImportItem from "../../../Dialog/dialog-item/DialogImportItem.jsx"
import ButtonCreateItem from "../../../button/item-buttons/ButtonCreateItem.jsx"
import ButtonDuplicateBdItem from "../../../button/item-buttons/ButtonDuplicateBdItem.jsx"
import ButtonDownloadItem from "../../../button/item-buttons/ButtonDownloadItem.jsx"
import ButtonEditItem from "../../../button/item-buttons/ButtonEditItem.jsx"
import ButtonExportItem from "../../../button/item-buttons/ButtonExportItem.jsx"
import ButtonImportItem from "../../../button/item-buttons/ButtonImportItem.jsx"
import SplitActionButton from "../../../button/SplitActionButton.jsx"
import SearchItem from "../../../search/SearchItem.jsx"
import { Export01, FilterFunnel, XClose } from "../../../template/TemplateIcons.jsx"
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
const SORT_FILTER_KEY = "sort"
const itemSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
]
const itemFilterMenuProps = {
    PaperProps: {
        className: "parent-table-mui-menu",
        sx: {
            maxHeight: 320,
            borderRadius: "10px",
            mt: 0.5,
        },
    },
}
const itemTableSelectMenuProps = {
    PaperProps: {
        className: "parent-table-mui-menu item-table__mui-menu",
        sx: {
            maxHeight: 280,
            borderRadius: "10px",
            mt: 0.5,
        },
    },
}

const defaultItemFilters = itemFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)
const itemFilterFieldOptions = [
    { key: SORT_FILTER_KEY, label: "Sort By" },
    ...itemFilterConfig,
]
const replenishmentTypeLabels = {
    RG: "Regular",
    SS: "Seasonal",
    BD: "Business Driven",
    NR: "Non Replenish",
}
const replenishmentTypeOptions = [
    { value: "", label: "None", variant: "empty" },
    { value: "RG", label: "Regular", variant: "replenishment-rg" },
    { value: "SS", label: "Seasonal", variant: "replenishment-ss" },
    { value: "BD", label: "Business Driven", variant: "replenishment-bd" },
    { value: "NR", label: "Non Replenish", variant: "replenishment-nr" },
]
const replenishmentTypeOptionMap = new Map(replenishmentTypeOptions.map((option) => [option.value, option]))
const itemStatusOptions = [
    { value: "ACTIVE", label: "Active", variant: "active" },
    { value: "INACTIVE", label: "Inactive", variant: "inactive" },
    { value: "DISCONTINUE", label: "Discontinue", variant: "discontinue" },
]
const itemStatusOptionMap = new Map(itemStatusOptions.map((option) => [option.value, option]))

function formatDisplayValue(value) {
    const displayValue = String(value ?? "").trim()

    return displayValue || "-"
}

function formatReplenishmentType(value) {
    const normalizedValue = String(value ?? "").trim().toUpperCase()

    return replenishmentTypeLabels[normalizedValue] ?? formatDisplayValue(normalizedValue)
}

function normalizeReplenishmentType(value) {
    const normalizedValue = String(value ?? "").trim().toUpperCase()

    if (normalizedValue === "NULL") {
        return ""
    }

    return replenishmentTypeOptionMap.has(normalizedValue) ? normalizedValue : ""
}

function getItemReplenishmentTypeValue(item) {
    return normalizeReplenishmentType(item?.replenishment_type)
}

function getReplenishmentTypeVariant(item) {
    const replenishmentType = getItemReplenishmentTypeValue(item)

    return replenishmentTypeOptionMap.get(replenishmentType)?.variant ?? "empty"
}

function getOptionLabel(optionMap, value, fallback = "-") {
    return optionMap.get(value)?.label ?? fallback
}

function getItemDisplayName(item) {
    return item?.item_name || item?.item_code || item?.barcode || "item ini"
}

function canDuplicateItemToBd(item) {
    const itemKind = String(item?.item_kind ?? "regular").trim().toLowerCase()

    return itemKind === "regular" && getItemReplenishmentTypeValue(item) !== "BD"
}

function hasItemBdDuplicate(item) {
    return item?.has_bd_duplicate === true || Number(item?.has_bd_duplicate) === 1
}

function getResponseItem(responseData) {
    const candidates = [
        responseData?.data?.data,
        responseData?.data,
        responseData,
    ]

    return candidates.find((candidate) =>
        candidate && typeof candidate === "object" && !Array.isArray(candidate) && getItemId(candidate),
    ) ?? null
}

function ItemTableSelect({
    id,
    type,
    variant,
    value,
    options,
    ariaLabel,
    title,
    disabled = false,
    onChange,
}) {
    return (
        <div
            className={[
                "item-table__select-wrap",
                type ? `item-table__select-wrap--${type}` : "",
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={(event) => event.stopPropagation()}
        >
            <FormControl
                size="small"
                className={[
                    "parent-table-mui-filter",
                    "item-table__mui-select",
                    type ? `item-table__mui-select--${type}` : "",
                    variant ? `item-table__mui-select--${variant}` : "",
                    disabled ? "item-table__mui-select--disabled" : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                <Select
                    id={id}
                    value={value}
                    aria-label={ariaLabel}
                    title={title}
                    disabled={disabled}
                    displayEmpty
                    MenuProps={itemTableSelectMenuProps}
                    onMouseDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(event) => onChange?.(event.target.value)}
                >
                    {options.map((option) => (
                        <MenuItem
                            key={option.value || "empty"}
                            value={option.value}
                            dense
                            disabled={option.disabled}
                        >
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </div>
    )
}

function DialogValidateInlineItemChange({
    change = null,
    isSubmitting = false,
    errorMessage = "",
    onClose,
    onConfirm,
}) {
    useEffect(() => {
        if (!change) {
            return undefined
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !isSubmitting) {
                onClose?.()
            }
        }

        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [change, isSubmitting, onClose])

    if (!change || typeof document === "undefined") {
        return null
    }

    const isDuplicateBd = change.type === "duplicate-bd"
    const dialogEyebrow = isDuplicateBd ? "Validasi Duplicate Item" : "Validasi Perubahan Item"
    const dialogTitle = isDuplicateBd
        ? "Konfirmasi Duplicate to BD"
        : change.type === "status"
            ? "Konfirmasi Perubahan Status"
            : "Konfirmasi Perubahan Replenishment"

    const description = isDuplicateBd
        ? "SKU baru akan dibuat dengan replenishment Business Driven dan barcode yang sama dengan SKU sumber. SKU Name akan diregenerate oleh backend (Parent Name + BD + Variant)."
        : change.type === "status"
            ? "Status item akan diperbarui menggunakan enum item terbaru."
            : "Replenishment type akan diperbarui dan SKU Name dapat diregenerate oleh backend, terutama saat memilih Business Driven."
    const confirmLabel = isDuplicateBd ? "Duplicate" : "Confirm"
    const submittingLabel = isDuplicateBd ? "Duplicating..." : "Saving..."

    const dialogNode = (
        <div
            className="dashboard-popup-overlay"
            role="presentation"
            onClick={() => {
                if (!isSubmitting) {
                    onClose?.()
                }
            }}
        >
            <div
                className="dashboard-popup item-table-validation-popup"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-inline-item-change-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="dashboard-popup__header">
                    <div>
                        <p className="dashboard-popup__eyebrow">{dialogEyebrow}</p>
                        <h2 className="dashboard-popup__title" id="dialog-inline-item-change-title">
                            {dialogTitle}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="dashboard-popup__close"
                        aria-label="Close dialog"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        <XClose size={18} />
                    </button>
                </div>

                <div className="dashboard-popup__body">
                    {isDuplicateBd ? (
                        <p className="dashboard-popup__text">
                            Duplikasi <strong>{change.itemName}</strong> (<strong>{change.sourceCode}</strong>)
                            {" "}menjadi SKU <strong>{change.targetCode}</strong> dengan barcode{" "}
                            <strong>{change.barcode}</strong>?
                        </p>
                    ) : (
                        <p className="dashboard-popup__text">
                            Ubah <strong>{change.itemName}</strong> dari{" "}
                            <strong>{change.previousLabel}</strong> ke <strong>{change.nextLabel}</strong>?
                        </p>
                    )}
                    <p className="dashboard-popup__text">
                        {description}
                    </p>
                    {errorMessage ? (
                        <p className="register-user-popup__hint item-table__status-error--dialog" role="alert">
                            {errorMessage}
                        </p>
                    ) : null}
                </div>

                <div className="dashboard-popup__actions">
                    <button
                        type="button"
                        className="dashboard-popup__button dashboard-popup__button--secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="dashboard-popup__button dashboard-popup__button--primary"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? submittingLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(dialogNode, document.body)
}

function renderItemValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function getFirstDisplayValue(values) {
    return values
        .map((value) => formatDisplayValue(value))
        .find((value) => value !== "-") || "-"
}

function getItemId(item) {
    return item?.id ?? item?.item_id ?? null
}

function normalizeItemStatus(value) {
    const normalizedStatus = String(value ?? "").trim().toUpperCase()

    if (normalizedStatus === "ACTIVE" || normalizedStatus === "INACTIVE" || normalizedStatus === "DISCONTINUE") {
        return normalizedStatus
    }

    if (normalizedStatus === "DISCONTINUED") {
        return "DISCONTINUE"
    }

    if (normalizedStatus === "1") {
        return "ACTIVE"
    }

    if (normalizedStatus === "0") {
        return "INACTIVE"
    }

    return ""
}

function getItemStatusValue(item) {
    const statusValue = normalizeItemStatus(item?.status)

    if (statusValue) {
        return statusValue
    }

    if (item?.is_active !== undefined && item?.is_active !== null) {
        return Number(item.is_active) === 1 ? "ACTIVE" : "INACTIVE"
    }

    return ""
}

function getItemStatusLabel(item) {
    const statusValue = getItemStatusValue(item)

    return itemStatusOptionMap.get(statusValue)?.label ?? "-"
}

function getItemStatusVariant(item) {
    const statusValue = getItemStatusValue(item)

    return itemStatusOptionMap.get(statusValue)?.variant ?? "pending"
}

function getCategoryPicName(item) {
    const category = item?.parent?.category ?? item?.category
    const categoryUsers = Array.isArray(category?.users) ? category.users : []
    const activeCategoryUsers = categoryUsers.filter((relation) => Number(relation?.is_active ?? 1) === 1)
    const primaryCategoryUser =
        activeCategoryUsers.find((relation) => Number(relation?.is_primary) === 1) ??
        activeCategoryUsers[0] ??
        categoryUsers[0]

    return getFirstDisplayValue([
        primaryCategoryUser?.user?.name,
        primaryCategoryUser?.user?.username,
        primaryCategoryUser?.name,
        primaryCategoryUser?.username,
        primaryCategoryUser?.central_user_name,
        primaryCategoryUser?.central_user_username,
        category?.pic_name,
        category?.pic?.name,
        category?.pic_user?.name,
        item?.pic_name,
        item?.parent?.pic_name,
        category?.pic_code,
        category?.pic?.code,
        primaryCategoryUser?.central_user_id,
        category?.pic_id,
        item?.pic_code,
        item?.parent?.pic_code,
    ])
}

function getItemChannels(item) {
    if (Array.isArray(item?.channels) && item.channels.length > 0) {
        return item.channels
    }

    if (Array.isArray(item?.parent?.brand?.channels) && item.parent.brand.channels.length > 0) {
        return item.parent.brand.channels
    }

    return []
}

function formatBusinessUnit(item) {
    const channels = getItemChannels(item)
    const channelBusinessUnit = channels
        .map((channel) =>
            getFirstDisplayValue([
                channel.business_unit?.code,
                channel.business_unit?.name,
                channel.business_unit_code,
                channel.business_unit_name,
                channel.business_unit_id,
            ]),
        )
        .find((value) => value !== "-")

    if (channelBusinessUnit) {
        return channelBusinessUnit
    }

    return getFirstDisplayValue([
        item?.business_unit?.code,
        item?.business_unit?.name,
        item?.business_unit_code,
        item?.business_unit_name,
        item?.businessUnit?.code,
        item?.businessUnit?.name,
        item?.businessUnit,
    ])
}

function formatItemChannels(item) {
    const channels = getItemChannels(item)

    if (channels.length === 0) {
        return getFirstDisplayValue([
            item?.department?.code,
            item?.department?.name,
            item?.channel_code,
            item?.channel_name,
            item?.channel,
        ])
    }

    return channels
        .map((channel) =>
            formatDisplayValue(
                channel.channel_code ??
                    channel.channel_name ??
                    channel.department_code ??
                    channel.department_name ??
                    channel.department?.code ??
                    channel.department?.name,
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
    const params = {
        item_kind: "regular",
    }

    itemFilterConfig.forEach((filterConfig) => {
        // skip item_kind filter since we always force regular
        if (filterConfig.apiParam === "item_kind") {
            return
        }

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
        header: "SKU Name / Code",
        headerStyle: { width: "18%", minWidth: 220 },
        cellStyle: { width: "18%", minWidth: 220 },
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
        headerStyle: { width: "9%", minWidth: 130 },
        cellStyle: { width: "9%", minWidth: 130 },
        render: (item) => renderItemValue(item.barcode),
    },
    {
        key: "parent",
        header: "Parent Name",
        headerStyle: { width: "13%", minWidth: 190 },
        cellStyle: { width: "13%", minWidth: 190 },
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
        headerStyle: { width: "7%", minWidth: 120 },
        cellStyle: { width: "7%", minWidth: 120 },
        render: (item) => renderItemValue(item.parent?.brand?.name),
    },
    {
        key: "category",
        header: "Category",
        headerStyle: { width: "10%", minWidth: 190 },
        cellStyle: { width: "10%", minWidth: 190 },
        render: (item) => (
            <DataTableIdentity
                title={item.parent?.category?.detail_category || "-"}
                subtitle={`PIC — ${getCategoryPicName(item)}`}
            />
        ),
    },
    {
        key: "businessUnit",
        header: "BU",
        headerStyle: { width: "6%", minWidth: 110 },
        cellStyle: { width: "6%", minWidth: 110 },
        render: (item) => renderItemValue(formatBusinessUnit(item)),
    },
    {
        key: "channels",
        header: "Channel",
        headerStyle: { width: "8%", minWidth: 130 },
        cellStyle: { width: "8%", minWidth: 130 },
        render: (item) => renderItemValue(formatItemChannels(item)),
    },
    {
        key: "uom",
        header: "UOM",
        headerStyle: { width: "5%", minWidth: 96 },
        cellStyle: { width: "5%", minWidth: 96 },
        render: (item) => renderItemValue(item.uom?.code ?? item.uom?.name),
    },
    {
        key: "replenishmentType",
        header: "Replenishment Type",
        headerStyle: { width: "8%", minWidth: 160 },
        cellStyle: { width: "8%", minWidth: 160 },
        render: (item) => renderItemValue(formatReplenishmentType(item.replenishment_type)),
    },
    {
        key: "pack",
        header: "Pack",
        headerStyle: { width: "7%", minWidth: 96 },
        cellStyle: { width: "7%", minWidth: 96 },
        render: (item) => renderItemValue(formatNumberValue(item.qty_per_pack)),
    },
    {
        key: "dimension",
        header: "Dimension (HWD)",
        headerStyle: { width: "9%", minWidth: 150 },
        cellStyle: { width: "9%", minWidth: 150 },
        render: (item) =>
            renderItemValue(
                `${formatNumberValue(item.height)} x ${formatNumberValue(item.width)} x ${formatNumberValue(item.depth)}`,
            ),
    },
    {
        key: "createdBy",
        header: "Created By",
        headerStyle: { width: "8%", minWidth: 140 },
        cellStyle: { width: "8%", minWidth: 140 },
        render: (item) => renderItemValue(item.created_by?.name || item.created_by?.username || item.created_by),
    },
]

function DataTableItem({
    searchQuery = "",
    onSearchQueryChange,
    tableLabel = "Items table",
    refreshKey = 0,
}) {
    const [filters, setFilters] = useState(defaultItemFilters)
    const [selectedFilterKeys, setSelectedFilterKeys] = useState([])
    const [sortValue, setSortValue] = useState(DEFAULT_ITEM_SORT)
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
    const [itemRows, setItemRows] = useState([])
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [importPreviewResponse, setImportPreviewResponse] = useState(null)
    const [importFileName, setImportFileName] = useState("")
    const [importErrorMessage, setImportErrorMessage] = useState("")
    const [isImportPreviewing, setIsImportPreviewing] = useState(false)
    const [importDialogKey, setImportDialogKey] = useState(0)
    const [reloadKey, setReloadKey] = useState(0)
    const [pendingStatusUpdates, setPendingStatusUpdates] = useState({})
    const [pendingReplenishmentUpdates, setPendingReplenishmentUpdates] = useState({})
    const [pendingInlineChange, setPendingInlineChange] = useState(null)
    const [isInlineValidationSubmitting, setIsInlineValidationSubmitting] = useState(false)
    const [inlineUpdateErrorMessage, setInlineUpdateErrorMessage] = useState("")
    const [inlineValidationErrorMessage, setInlineValidationErrorMessage] = useState("")
    const { notifySuccess } = useAlertAction()
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
    const selectedFilterConfigs = useMemo(
        () =>
            selectedFilterKeys
                .map((filterKey) => itemFilterConfig.find((filterConfig) => filterConfig.key === filterKey))
                .filter(Boolean),
        [selectedFilterKeys],
    )
    const hasSelectedSortFilter = selectedFilterKeys.includes(SORT_FILTER_KEY)

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

    const closeImportDialog = () => {
        setActiveActionDialog(null)
        setImportPreviewResponse(null)
        setImportFileName("")
        setImportErrorMessage("")
        setIsImportPreviewing(false)
    }

    const openActionDialog = (dialogType, item) => {
        setSelectedItem(item)
        setActiveActionDialog(dialogType)
    }

    const openImportDialog = () => {
        setImportDialogKey((currentKey) => currentKey + 1)
        setImportFileName("")
        setImportPreviewResponse(null)
        setImportErrorMessage("")
        setIsImportPreviewing(false)
        setActiveActionDialog("import")
    }

    const handleImportFileSelect = async (file) => {
        if (!file || isImportPreviewing) {
            return
        }

        const formData = new FormData()

        formData.append("file", file)
        setImportFileName(file.name)
        setImportPreviewResponse(null)
        setImportErrorMessage("")
        setIsImportPreviewing(true)

        try {
            const previewResponse = await api.itemData.imports.itemsPreview(formData)

            setImportPreviewResponse(previewResponse)
        } catch (error) {
            setImportErrorMessage(error?.message || "Gagal membuat preview import item.")
        } finally {
            setIsImportPreviewing(false)
        }
    }

    const handleImportCommitted = () => {
        setReloadKey((currentKey) => currentKey + 1)
    }

    const updateItemRow = (changedItem, nextValues) => {
        const itemId = getItemId(changedItem)

        setItemRows((currentRows) =>
            currentRows.map((row) =>
                getItemId(row) === itemId
                    ? { ...row, ...nextValues }
                    : row,
            ),
        )
    }

    const updateItemRowStatus = (changedItem, newStatus) => {
        updateItemRow(changedItem, {
            status: newStatus,
            is_active: newStatus === "ACTIVE" ? 1 : 0,
        })
    }

    const handleStatusChange = async (item, nextStatusValue) => {
        const itemId = getItemId(item)
        const previousStatus = getItemStatusValue(item)
        const nextStatus = normalizeItemStatus(nextStatusValue)

        if (!itemId || !nextStatus || nextStatus === previousStatus) {
            return false
        }

        setInlineUpdateErrorMessage("")
        setPendingStatusUpdates((currentUpdates) => ({
            ...currentUpdates,
            [itemId]: true,
        }))
        updateItemRowStatus(item, nextStatus)

        try {
            const response = await api.items.updateStatus(itemId, nextStatus)
            const updatedItem = getResponseItem(response)

            if (updatedItem) {
                updateItemRow(item, updatedItem)
            }

            return true
        } catch (error) {
            updateItemRowStatus(item, previousStatus)
            setInlineUpdateErrorMessage(error?.message || "Gagal mengubah status item.")
            return false
        } finally {
            setPendingStatusUpdates((currentUpdates) => {
                const nextUpdates = { ...currentUpdates }

                delete nextUpdates[itemId]

                return nextUpdates
            })
        }
    }

    const handleReplenishmentTypeChange = async (item, nextReplenishmentValue) => {
        const itemId = getItemId(item)
        const previousReplenishmentType = getItemReplenishmentTypeValue(item)
        const nextReplenishmentType = normalizeReplenishmentType(nextReplenishmentValue)

        if (!itemId || nextReplenishmentType === previousReplenishmentType) {
            return false
        }

        setInlineUpdateErrorMessage("")
        setPendingReplenishmentUpdates((currentUpdates) => ({
            ...currentUpdates,
            [itemId]: true,
        }))
        updateItemRow(item, { replenishment_type: nextReplenishmentType || null })

        try {
            const response = await api.items.update(itemId, {
                replenishment_type: nextReplenishmentType || null,
            })
            const updatedItem = getResponseItem(response)

            if (updatedItem) {
                updateItemRow(item, updatedItem)
            }

            return true
        } catch (error) {
            updateItemRow(item, { replenishment_type: previousReplenishmentType || null })
            setInlineUpdateErrorMessage(error?.message || "Gagal mengubah replenishment type item.")
            return false
        } finally {
            setPendingReplenishmentUpdates((currentUpdates) => {
                const nextUpdates = { ...currentUpdates }

                delete nextUpdates[itemId]

                return nextUpdates
            })
        }
    }

    const requestStatusChange = (item, nextStatusValue) => {
        const itemId = getItemId(item)
        const previousStatus = getItemStatusValue(item)
        const nextStatus = normalizeItemStatus(nextStatusValue)

        if (!itemId) {
            setInlineUpdateErrorMessage("Item ID tidak ditemukan.")
            return
        }

        if (!itemStatusOptionMap.has(nextStatus)) {
            setInlineUpdateErrorMessage("Status item tidak valid.")
            return
        }

        if (nextStatus === previousStatus) {
            return
        }

        setInlineUpdateErrorMessage("")
        setPendingInlineChange({
            type: "status",
            item,
            nextValue: nextStatus,
            previousLabel: getOptionLabel(itemStatusOptionMap, previousStatus),
            nextLabel: getOptionLabel(itemStatusOptionMap, nextStatus),
            itemName: getItemDisplayName(item),
        })
    }

    const requestReplenishmentTypeChange = (item, nextReplenishmentValue) => {
        const itemId = getItemId(item)
        const previousReplenishmentType = getItemReplenishmentTypeValue(item)
        const nextReplenishmentType = normalizeReplenishmentType(nextReplenishmentValue)

        if (!itemId) {
            setInlineUpdateErrorMessage("Item ID tidak ditemukan.")
            return
        }

        if (item?.item_kind && item.item_kind !== "regular") {
            setInlineUpdateErrorMessage("Replenishment type hanya bisa diubah untuk regular item.")
            return
        }

        if (!replenishmentTypeOptionMap.has(nextReplenishmentType)) {
            setInlineUpdateErrorMessage("Replenishment type tidak valid.")
            return
        }

        if (nextReplenishmentType === previousReplenishmentType) {
            return
        }

        setInlineUpdateErrorMessage("")
        setPendingInlineChange({
            type: "replenishment",
            item,
            nextValue: nextReplenishmentType,
            previousLabel: getOptionLabel(
                replenishmentTypeOptionMap,
                previousReplenishmentType,
                "None",
            ),
            nextLabel: getOptionLabel(replenishmentTypeOptionMap, nextReplenishmentType, "None"),
            itemName: getItemDisplayName(item),
        })
    }

    const requestDuplicateToBd = (item) => {
        const itemId = getItemId(item)

        if (!itemId) {
            setInlineUpdateErrorMessage("Item ID tidak ditemukan.")
            return
        }

        if (!canDuplicateItemToBd(item)) {
            setInlineUpdateErrorMessage("Duplicate to BD hanya bisa untuk regular item dengan replenishment type selain Business Driven.")
            return
        }

        if (hasItemBdDuplicate(item)) {
            setInlineUpdateErrorMessage(`SKU BD ${item.item_code}-BD sudah ada.`)
            return
        }

        const sourceCode = formatDisplayValue(item.item_code)

        setInlineUpdateErrorMessage("")
        setInlineValidationErrorMessage("")
        setPendingInlineChange({
            type: "duplicate-bd",
            item,
            itemName: getItemDisplayName(item),
            sourceCode,
            targetCode: `${sourceCode}-BD`,
            barcode: formatDisplayValue(item.barcode),
        })
    }

    const handleDuplicateToBd = async (item) => {
        const itemId = getItemId(item)

        if (!itemId) {
            return false
        }

        try {
            const response = await api.items.duplicateBd(itemId)
            const createdItem = getResponseItem(response)
            const createdCode = createdItem?.item_code || `${item.item_code}-BD`

            notifySuccess(`SKU BD ${createdCode} created successfully.`)
            setReloadKey((currentKey) => currentKey + 1)

            return true
        } catch (error) {
            setInlineValidationErrorMessage(error?.message || "Gagal menduplikasi item ke BD.")
            return false
        }
    }

    const closeInlineValidationDialog = () => {
        if (isInlineValidationSubmitting) {
            return
        }

        setPendingInlineChange(null)
        setInlineValidationErrorMessage("")
    }

    const confirmInlineValidationChange = async () => {
        if (!pendingInlineChange || isInlineValidationSubmitting) {
            return
        }

        setIsInlineValidationSubmitting(true)

        try {
            let isSaved = false

            if (pendingInlineChange.type === "duplicate-bd") {
                isSaved = await handleDuplicateToBd(pendingInlineChange.item)
            } else if (pendingInlineChange.type === "status") {
                isSaved = await handleStatusChange(pendingInlineChange.item, pendingInlineChange.nextValue)
            } else {
                isSaved = await handleReplenishmentTypeChange(pendingInlineChange.item, pendingInlineChange.nextValue)
            }

            if (isSaved) {
                setPendingInlineChange(null)
            }
        } finally {
            setIsInlineValidationSubmitting(false)
        }
    }

    const actionColumn = {
        key: "action",
        header: "Action",
        headerClassName: "users-table__action-header",
        cellClassName: "users-table__action-cell",
        headerStyle: { width: "7%", minWidth: 110 },
        cellStyle: { width: "7%", minWidth: 110, whiteSpace: "nowrap" },
        render: (item) => {
            const isItemEditable = getItemStatusValue(item) === "ACTIVE"
            const isBdDuplicable = canDuplicateItemToBd(item)
            const hasBdDuplicate = hasItemBdDuplicate(item)

            return (
                <div className="parent-action-buttons">
                    <ButtonEditItem
                        title={isItemEditable ? "Edit" : "Item non-aktif/discontinue tidak dapat diedit"}
                        aria-label={`Edit ${item.item_name || item.item_code || "item"}`}
                        disabled={!isItemEditable}
                        onClick={(event) => {
                            event.stopPropagation()

                            if (!isItemEditable) {
                                return
                            }

                            openActionDialog("edit", item)
                        }}
                    />
                    {isBdDuplicable ? (
                        <ButtonDuplicateBdItem
                            className={hasBdDuplicate ? "parent-action-button--duplicate-exists" : ""}
                            title={hasBdDuplicate ? `SKU BD ${item.item_code}-BD sudah ada` : "Duplicate to BD"}
                            aria-label={`Duplicate ${item.item_name || item.item_code || "item"} to BD`}
                            disabled={hasBdDuplicate || !getItemId(item)}
                            onClick={(event) => {
                                event.stopPropagation()

                                if (hasBdDuplicate) {
                                    return
                                }

                                requestDuplicateToBd(item)
                            }}
                        />
                    ) : null}
                </div>
            )
        },
    }

    const itemColumns = columns.map((column) => {
        if (column.key !== "replenishmentType") {
            return column
        }

        return {
            ...column,
            headerStyle: { width: "8%", minWidth: 150 },
            cellStyle: { width: "8%", minWidth: 150 },
            render: (item) => {
                const itemId = getItemId(item)
                const replenishmentType = getItemReplenishmentTypeValue(item)
                const isUpdatingReplenishment = Boolean(itemId && pendingReplenishmentUpdates[itemId])
                const displayLabel = replenishmentType
                    ? formatReplenishmentType(replenishmentType)
                    : "None"

                return (
                    <ItemTableSelect
                        id={`item-replenishment-${itemId ?? item.item_code ?? item.barcode ?? "unknown"}`}
                        type="replenishment"
                        variant={getReplenishmentTypeVariant(item)}
                        value={replenishmentType}
                        options={replenishmentTypeOptions}
                        ariaLabel={`Replenishment type ${item.item_name || item.item_code || "item"}`}
                        title={isUpdatingReplenishment ? "Menyimpan replenishment..." : displayLabel}
                        disabled={isUpdatingReplenishment || !itemId}
                        onChange={(nextValue) => requestReplenishmentTypeChange(item, nextValue)}
                    />
                )
            },
        }
    })

    const tableColumns = [
        actionColumn,
        ...itemColumns,
        {
            key: "status",
            header: "Status",
            headerStyle: { width: "6%", minWidth: 124 },
            cellStyle: { width: "6%", minWidth: 124 },
            render: (item) => {
                const itemId = getItemId(item)
                const statusValue = getItemStatusValue(item)
                const statusVariant = getItemStatusVariant(item)
                const isUpdatingStatus = Boolean(itemId && pendingStatusUpdates[itemId])
                const statusOptions = statusValue
                    ? itemStatusOptions
                    : [{ value: "", label: "Unknown", disabled: true }, ...itemStatusOptions]

                return (
                    <ItemTableSelect
                        id={`item-status-${itemId ?? item.item_code ?? item.barcode ?? "unknown"}`}
                        type="status"
                        variant={statusVariant}
                        value={statusValue}
                        options={statusOptions}
                        ariaLabel={`Status ${item.item_name || item.item_code || "item"}`}
                        title={isUpdatingStatus ? "Menyimpan status..." : getItemStatusLabel(item)}
                        disabled={isUpdatingStatus || !itemId}
                        onChange={(nextValue) => requestStatusChange(item, nextValue)}
                    />
                )
            },
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
                    item.id === deletedItem.id ? { ...item, status: "INACTIVE", is_active: 0 } : item,
                ),
            )
        }

        closeActionDialog()
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

    const updateSelectedFilterKeys = (nextFilterKeys) => {
        const validFilterKeySet = new Set(itemFilterFieldOptions.map((filterConfig) => filterConfig.key))
        const normalizedFilterKeys = Array.from(new Set(nextFilterKeys)).filter((filterKey) =>
            validFilterKeySet.has(filterKey),
        )

        setSelectedFilterKeys(normalizedFilterKeys)
        setFilters((currentFilters) =>
            itemFilterConfig.reduce(
                (nextFilters, filterConfig) => ({
                    ...nextFilters,
                    [filterConfig.key]: normalizedFilterKeys.includes(filterConfig.key)
                        ? currentFilters[filterConfig.key] ?? ALL_FILTER_VALUE
                        : ALL_FILTER_VALUE,
                }),
                {},
            ),
        )

        if (!normalizedFilterKeys.includes(SORT_FILTER_KEY)) {
            setSortValue(DEFAULT_ITEM_SORT)
        }
    }

    const handleFilterKeyToggle = (filterKey) => {
        updateSelectedFilterKeys(
            selectedFilterKeys.includes(filterKey)
                ? selectedFilterKeys.filter((selectedFilterKey) => selectedFilterKey !== filterKey)
                : [...selectedFilterKeys, filterKey],
        )
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

    const handleSortChange = (event) => {
        const nextSortValue = event.target.value

        if (nextSortValue === sortValue) {
            return
        }

        setSortValue(nextSortValue)
    }

    const handleResetFilters = () => {
        setSelectedFilterKeys([])
        setFilters(defaultItemFilters)
        setSortValue(DEFAULT_ITEM_SORT)
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
        previousLabel: "<",
        nextLabel: ">",
        circularButtons: true,
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
            <div
                className="parent-table-toolbar parent-table-toolbar--actions parent-table-toolbar--desktop"
                aria-label="Item table tools"
            >
                <div className="parent-table-toolbar__lookup">
                    <div className="parent-table-filter-entry" aria-label="Filter item">
                        <button
                            type="button"
                            className={[
                                "parent-table-filter-trigger",
                                selectedFilterKeys.length > 0 ? "parent-table-filter-trigger--active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            aria-label="Open item filter dialog"
                            title="Filter"
                            onClick={() => setIsFilterDialogOpen(true)}
                        >
                            <FilterFunnel size={18} aria-hidden="true" />
                            {selectedFilterKeys.length > 0 ? (
                                <span className="parent-table-filter-trigger__dot" aria-hidden="true" />
                            ) : null}
                        </button>
                    </div>

                    <div className="parent-table-toolbar__search">
                        <SearchItem
                            value={searchQuery}
                            onChange={onSearchQueryChange}
                        />
                    </div>
                </div>

                <div className="parent-table-actions parent-table-actions--primary">
                    <ButtonCreateItem
                        className="parent-table-tool-button parent-table-tool-button--create"
                        aria-label="Create item data"
                        onCreated={() => setReloadKey((currentKey) => currentKey + 1)}
                    >
                        Create
                    </ButtonCreateItem>
                    <ButtonExportItem
                        variant="action"
                        className="parent-table-tool-button parent-table-tool-button--download"
                        dialogEyebrow="Export Item"
                        dialogTitle="Export Item Management"
                        aria-label="Export item data"
                    >
                        <Export01 size={18} aria-hidden="true" />
                        <span>Export</span>
                    </ButtonExportItem>
                    <ButtonImportItem
                        aria-label="Import item data"
                        onClick={(event) => {
                            event.preventDefault()
                            openImportDialog()
                        }}
                        disabled={isImportPreviewing}
                        aria-busy={isImportPreviewing}
                    >
                        {isImportPreviewing ? "Previewing..." : "Import"}
                    </ButtonImportItem>
                </div>
            </div>

            <div
                className="parent-table-toolbar parent-table-toolbar--actions parent-table-toolbar--mobile"
                aria-label="Item table tools (mobile)"
            >
                <div className="parent-table-toolbar__search-group">
                    <div className="parent-table-toolbar__search">
                        <SearchItem
                            value={searchQuery}
                            onChange={onSearchQueryChange}
                        />
                    </div>

                    <SplitActionButton
                        menuLabel="More item actions"
                        mainAction={
                            <ButtonCreateItem
                                className="parent-table-tool-button parent-table-tool-button--create parent-table-split-button__main"
                                aria-label="Create item data"
                                onCreated={() => setReloadKey((currentKey) => currentKey + 1)}
                            >
                                Create
                            </ButtonCreateItem>
                        }
                    >
                        <button
                            type="button"
                            role="menuitem"
                            className={[
                                "parent-table-split-button__item",
                                selectedFilterKeys.length > 0 ? "parent-table-split-button__item--active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            aria-label="Open item filter dialog"
                            onClick={() => setIsFilterDialogOpen(true)}
                        >
                            <FilterFunnel size={17} aria-hidden="true" />
                            <span>Filter</span>
                            {selectedFilterKeys.length > 0 ? (
                                <span className="parent-table-split-button__dot" aria-hidden="true" />
                            ) : null}
                        </button>
                        <ButtonExportItem
                            role="menuitem"
                            variant="action"
                            className="parent-table-split-button__item"
                            dialogEyebrow="Export Item"
                            dialogTitle="Export Item Management"
                            aria-label="Export item data"
                        >
                            <Export01 size={17} aria-hidden="true" />
                            <span>Export</span>
                        </ButtonExportItem>
                        <ButtonImportItem
                            role="menuitem"
                            className="parent-table-split-button__item"
                            aria-label="Import item data"
                            onClick={(event) => {
                                event.preventDefault()
                                openImportDialog()
                            }}
                            disabled={isImportPreviewing}
                            aria-busy={isImportPreviewing}
                        >
                            {isImportPreviewing ? "Previewing..." : "Import"}
                        </ButtonImportItem>
                    </SplitActionButton>
                </div>
            </div>

            {inlineUpdateErrorMessage ? (
                <p className="register-user-popup__hint item-table__status-error" role="alert">
                    {inlineUpdateErrorMessage}
                </p>
            ) : null}

            <DataTable
                className="mtickets-table parent-table-grid parent-items-table-grid"
                rows={isLoading ? [] : rows}
                columns={tableColumns}
                getRowId={(item) => item.id ?? item.item_code ?? item.barcode}
                tableLabel={tableLabel}
                loading={isLoading}
                loadingMessage={loadingPageMessage}
                emptyMessage={emptyMessage}
                pagination={pagination}
                autoHeight={false}
            />

            <DialogFilterItem
                isOpen={isFilterDialogOpen}
                filterConfigs={itemFilterConfig}
                filterFieldOptions={itemFilterFieldOptions}
                selectedFilterKeys={selectedFilterKeys}
                selectedFilterConfigs={selectedFilterConfigs}
                filters={filters}
                filterOptions={filterOptions}
                allFilterValue={ALL_FILTER_VALUE}
                defaultSortValue={DEFAULT_ITEM_SORT}
                sortOptions={itemSortOptions}
                menuProps={itemFilterMenuProps}
                hasSelectedSortFilter={hasSelectedSortFilter}
                sortValue={sortValue}
                onClose={() => setIsFilterDialogOpen(false)}
                onFilterKeyToggle={handleFilterKeyToggle}
                onFilterChange={handleFilterChange}
                onSortChange={handleSortChange}
                onReset={handleResetFilters}
            />

            <DialogEditItem
                key={`edit-item-${selectedItem?.id ?? selectedItem?.item_code ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit SKU"
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

            <DialogValidateInlineItemChange
                change={pendingInlineChange}
                isSubmitting={isInlineValidationSubmitting}
                errorMessage={inlineValidationErrorMessage}
                onClose={closeInlineValidationDialog}
                onConfirm={confirmInlineValidationChange}
            />

            <DialogImportItem
                key={`import-item-${importDialogKey}`}
                isOpen={activeActionDialog === "import"}
                eyebrow="Import Item"
                title="Preview Import Item"
                fileName={importFileName}
                previewResponse={importPreviewResponse}
                errorMessage={importErrorMessage}
                isPreviewing={isImportPreviewing}
                templateButton={<ButtonDownloadItem aria-label="Download template item" />}
                onClose={closeImportDialog}
                onCommitted={handleImportCommitted}
                onFileSelect={handleImportFileSelect}
            />
        </div>
    )
}

export default DataTableItem
