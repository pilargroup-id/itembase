import { useEffect, useMemo, useState } from "react"

import api from "../../../../services/api.js"
import FilterDropdownBundle from "../../../dropdown/filter-bundles/FilterDropdownBundles.jsx"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const actionOptions = [
    { value: ALL_FILTER_VALUE, label: "All Action" },
    { value: "CREATE", label: "Create" },
    { value: "UPDATE", label: "Update" },
    { value: "DELETE", label: "Delete" },
    { value: "STATUS_CHANGE", label: "Status Change" },
    { value: "SYNC", label: "Sync" },
]

const entityTypeOptions = [
    { value: ALL_FILTER_VALUE, label: "All Module" },
    { value: "master_brands", label: "Master Brand" },
    { value: "master_pics", label: "Master PIC" },
    { value: "master_pic_users", label: "Master PIC Users" },
    { value: "master_categories", label: "Master Category" },
    { value: "master_item_types", label: "Master Item Type" },
    { value: "master_ports", label: "Master Port" },
    { value: "master_uoms", label: "Master UOM" },
    { value: "master_sku_statuses", label: "Master SKU Status" },
    { value: "item_parents", label: "Item Parent" },
    { value: "items", label: "Items" },
]

const defaultFilters = {
    action: ALL_FILTER_VALUE,
    entityType: ALL_FILTER_VALUE,
    entityId: "",
    userId: "",
    dateFrom: "",
    dateTo: "",
}

const MAX_CHANGE_ITEMS = 6
const preferredChangeFields = [
    "status",
    "is_active",
    "name",
    "item_name",
    "parent_name",
    "code",
    "item_code",
    "parent_code",
    "description",
    "category",
    "brand",
    "type",
    "uom",
]

function normalizeFilterValue(value) {
    return String(value ?? "").trim()
}

function formatDisplayValue(value) {
    const displayValue = normalizeFilterValue(value)

    return displayValue || "-"
}

function renderStackedValue(primaryValue, secondaryValue) {
    const primaryDisplayValue = formatDisplayValue(primaryValue)
    const secondaryDisplayValue = formatDisplayValue(secondaryValue)

    return (
        <div className="activity-log-cell-stack">
            <span className="activity-log-cell-stack__primary" title={primaryDisplayValue}>
                {primaryDisplayValue}
            </span>
            <span className="activity-log-cell-stack__secondary" title={secondaryDisplayValue}>
                {secondaryDisplayValue}
            </span>
        </div>
    )
}

function getActionLabel(action) {
    const normalizedAction = normalizeFilterValue(action)
    const option = actionOptions.find((item) => item.value === normalizedAction)

    return option?.label ?? formatDisplayValue(normalizedAction)
}

function getEntityTypeLabel(entityType) {
    const normalizedEntityType = normalizeFilterValue(entityType)
    const option = entityTypeOptions.find((item) => item.value === normalizedEntityType)

    return option?.label ?? formatDisplayValue(normalizedEntityType)
}

function getActionVariant(action) {
    const normalizedAction = normalizeFilterValue(action).toLowerCase().replace(/_/g, "-")

    return normalizedAction ? `log-${normalizedAction}` : "inactive"
}

function getUserTitle(log) {
    return log?.user?.name || log?.user?.username || log?.user_id || "System"
}

function getUserSubtitle(log) {
    if (log?.user?.name && log?.user?.username) {
        return log.user.username
    }

    return log?.user?.email || log?.user_id || ""
}

function formatDateTime(value) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return formatDisplayValue(value)
    }

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date)
}

function normalizeActivityLogRows(responseData) {
    if (Array.isArray(responseData)) {
        return responseData
    }

    if (Array.isArray(responseData?.data)) {
        return responseData.data
    }

    if (Array.isArray(responseData?.data?.data)) {
        return responseData.data.data
    }

    if (Array.isArray(responseData?.rows)) {
        return responseData.rows
    }

    if (Array.isArray(responseData?.results)) {
        return responseData.results
    }

    return []
}

function normalizeActivityLogMeta(responseData, fallbackPage, fallbackLimit, rowCount) {
    const meta = responseData?.meta ?? responseData?.data?.meta ?? {}
    const page = Number(meta.page ?? fallbackPage)
    const limit = Number(meta.limit ?? fallbackLimit)
    const total = Number(meta.total ?? rowCount)
    const totalPages = Number(meta.total_page ?? meta.totalPage ?? meta.total_pages)

    return {
        page: Number.isInteger(page) && page > 0 ? page : fallbackPage,
        limit: Number.isInteger(limit) && limit > 0 ? limit : fallbackLimit,
        total: Number.isInteger(total) && total >= 0 ? total : rowCount,
        totalPages: Number.isInteger(totalPages) && totalPages > 0
            ? totalPages
            : Math.max(1, Math.ceil((Number.isInteger(total) && total >= 0 ? total : rowCount) / fallbackLimit)),
    }
}

function createActivityLogApiParams({
    filters,
    searchQuery,
    currentPage,
    pageSize,
}) {
    const params = {
        page: currentPage,
        limit: pageSize,
    }
    const normalizedSearchQuery = normalizeFilterValue(searchQuery)
    const selectedAction = normalizeFilterValue(filters.action)
    const selectedEntityType = normalizeFilterValue(filters.entityType)
    const selectedEntityId = normalizeFilterValue(filters.entityId)
    const selectedUserId = normalizeFilterValue(filters.userId)
    const selectedDateFrom = normalizeFilterValue(filters.dateFrom)
    const selectedDateTo = normalizeFilterValue(filters.dateTo)

    if (normalizedSearchQuery) {
        params.search = normalizedSearchQuery
    }

    if (selectedAction && selectedAction !== ALL_FILTER_VALUE) {
        params.action = selectedAction
    }

    if (selectedEntityType && selectedEntityType !== ALL_FILTER_VALUE) {
        params.entity_type = selectedEntityType
    }

    if (selectedEntityId) {
        params.entity_id = selectedEntityId
    }

    if (selectedUserId) {
        params.user_id = selectedUserId
    }

    if (selectedDateFrom) {
        params.date_from = selectedDateFrom
    }

    if (selectedDateTo) {
        params.date_to = selectedDateTo
    }

    return params
}

function getPaginationSummary(firstItem, lastItem, totalItems) {
    if (totalItems === 0) {
        return "0 dari 0 log"
    }

    return `${firstItem}-${lastItem} dari ${totalItems} log`
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function toComparableValue(value) {
    if (value === undefined || value === null) {
        return value
    }

    if (typeof value === "object") {
        try {
            return JSON.stringify(value)
        } catch {
            return String(value)
        }
    }

    return String(value)
}

function formatFieldLabel(value) {
    const normalizedValue = normalizeFilterValue(value)
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim()

    if (!normalizedValue) {
        return "Field"
    }

    return normalizedValue
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
}

function formatCompactDataValue(value) {
    if (value === undefined || value === "") {
        return "-"
    }

    if (value === null) {
        return "null"
    }

    if (typeof value === "boolean") {
        return value ? "Yes" : "No"
    }

    if (Array.isArray(value)) {
        return value.length === 0 ? "[]" : `${value.length} item`
    }

    if (isPlainObject(value)) {
        const labelValue =
            value.name ??
            value.label ??
            value.title ??
            value.code ??
            value.id

        return labelValue === undefined
            ? `${Object.keys(value).length} field`
            : formatCompactDataValue(labelValue)
    }

    return String(value)
}

function getFieldPriority(fieldName) {
    const normalizedFieldName = normalizeFilterValue(fieldName).toLowerCase()
    const exactIndex = preferredChangeFields.indexOf(normalizedFieldName)

    if (exactIndex >= 0) {
        return exactIndex
    }

    const partialIndex = preferredChangeFields.findIndex((field) =>
        normalizedFieldName.includes(field),
    )

    return partialIndex >= 0 ? partialIndex + preferredChangeFields.length : 999
}

function getLogChangeItems(log) {
    const beforeData = isPlainObject(log.before_data) ? log.before_data : {}
    const afterData = isPlainObject(log.after_data) ? log.after_data : {}
    const action = normalizeFilterValue(log.action).toUpperCase()
    const fieldNames = Array.from(new Set([
        ...Object.keys(beforeData),
        ...Object.keys(afterData),
    ]))

    const changeItems = fieldNames
        .map((fieldName) => ({
            fieldName,
            beforeValue: beforeData[fieldName],
            afterValue: afterData[fieldName],
        }))
        .filter((item) => {
            if (action === "CREATE") {
                return item.afterValue !== undefined
            }

            if (action === "DELETE") {
                return item.beforeValue !== undefined
            }

            return toComparableValue(item.beforeValue) !== toComparableValue(item.afterValue)
        })
        .sort((firstItem, secondItem) => {
            const priorityDifference =
                getFieldPriority(firstItem.fieldName) - getFieldPriority(secondItem.fieldName)

            if (priorityDifference !== 0) {
                return priorityDifference
            }

            return firstItem.fieldName.localeCompare(secondItem.fieldName)
        })

    return changeItems.slice(0, MAX_CHANGE_ITEMS).map((item) => ({
        ...item,
        hiddenCount: Math.max(0, changeItems.length - MAX_CHANGE_ITEMS),
    }))
}

function LogChangeSummary({ log }) {
    const changeItems = getLogChangeItems(log)
    const hiddenCount = changeItems[0]?.hiddenCount ?? 0

    if (changeItems.length === 0) {
        return (
            <div className="activity-log-change-summary activity-log-change-summary--empty">
                Tidak ada perubahan data utama yang perlu ditampilkan.
            </div>
        )
    }

    return (
        <div className="activity-log-change-summary">
            {changeItems.map((item) => (
                <div className="activity-log-change-card" key={item.fieldName}>
                    <span className="activity-log-change-card__label">
                        {formatFieldLabel(item.fieldName)}
                    </span>
                    <div className="activity-log-change-card__values">
                        <span
                            className="activity-log-change-card__value activity-log-change-card__value--before"
                            title={formatCompactDataValue(item.beforeValue)}
                        >
                            {formatCompactDataValue(item.beforeValue)}
                        </span>
                        <span className="activity-log-change-card__arrow" aria-hidden="true">
                            -&gt;
                        </span>
                        <span
                            className="activity-log-change-card__value activity-log-change-card__value--after"
                            title={formatCompactDataValue(item.afterValue)}
                        >
                            {formatCompactDataValue(item.afterValue)}
                        </span>
                    </div>
                </div>
            ))}
            {hiddenCount > 0 ? (
                <span className="activity-log-change-summary__more">
                    +{hiddenCount} field lain disembunyikan
                </span>
            ) : null}
        </div>
    )
}

function DateFilterInput({ id, label, value, onChange }) {
    return (
        <label className="activity-log-date-filter" htmlFor={id}>
            <span className="activity-log-date-filter__label">{label}</span>
            <input
                id={id}
                className="activity-log-date-filter__input"
                type="date"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    )
}

function TextFilterInput({ id, label, placeholder, value, onChange }) {
    return (
        <label className="activity-log-date-filter" htmlFor={id}>
            <span className="activity-log-date-filter__label">{label}</span>
            <input
                id={id}
                className="activity-log-date-filter__input"
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    )
}

const columns = [
    {
        key: "activity",
        header: "Activity",
        headerStyle: { width: "19%" },
        cellStyle: { width: "19%" },
        render: (log) => renderStackedValue(
            formatDateTime(log.created_at),
            getEntityTypeLabel(log.entity_type),
        ),
    },
    {
        key: "actor",
        header: "Actor",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (log) => (
            <DataTableIdentity
                title={getUserTitle(log)}
                subtitle={log.ip_address ? `${getUserSubtitle(log) || "No user detail"} | ${log.ip_address}` : getUserSubtitle(log)}
            />
        ),
    },
    {
        key: "action",
        header: "Action",
        headerStyle: { width: "12%" },
        cellStyle: { width: "12%" },
        render: (log) => (
            <DataTableStatus inline variant={getActionVariant(log.action)}>
                {getActionLabel(log.action)}
            </DataTableStatus>
        ),
    },
    {
        key: "description",
        header: "Description",
        headerStyle: { width: "41%" },
        cellStyle: { width: "41%" },
        render: (log) => renderStackedValue(
            log.description,
            log.entity_id ? `Entity ID: ${log.entity_id}` : "Click detail untuk audit data",
        ),
    },
]

const detailConfig = {
    position: "right",
    columnLabel: "",
    buttonLabel: "",
    eyebrow: (log) => getActionLabel(log.action),
    title: (log) => log.description || log.id,
    description: (log) => `${getEntityTypeLabel(log.entity_type)} - ${formatDisplayValue(log.entity_id)}`,
    sections: (log) => [
        {
            title: "Ringkasan",
            fields: [
                { label: "Waktu", value: formatDateTime(log.created_at) },
                { label: "Action", value: getActionLabel(log.action) },
                { label: "Module", value: getEntityTypeLabel(log.entity_type) },
                { label: "Entity ID", value: log.entity_id },
                { label: "Description", value: log.description },
            ],
        },
        {
            title: "Actor",
            fields: [
                { label: "User Name", value: log.user?.name },
                { label: "Username", value: log.user?.username },
                { label: "User ID", value: log.user_id },
                { label: "IP Address", value: log.ip_address },
            ],
        },
        {
            title: "Perubahan Penting",
            wide: true,
            fields: [
                {
                    label: "Field",
                    kind: "chips",
                    render: () => <LogChangeSummary log={log} />,
                },
            ],
        },
    ],
}

function DataTableLogs({
    searchQuery = "",
    tableLabel = "Activity logs table",
    refreshKey = 0,
}) {
    const [activityLogRows, setActivityLogRows] = useState([])
    const [filters, setFilters] = useState(defaultFilters)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")

    const activityLogApiParams = useMemo(
        () =>
            createActivityLogApiParams({
                filters,
                searchQuery,
                currentPage,
                pageSize,
            }),
        [currentPage, filters, pageSize, searchQuery],
    )

    useEffect(() => {
        let isMounted = true
        const controller = new AbortController()

        const loadActivityLogs = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.activityLogs.list(activityLogApiParams, {
                    signal: controller.signal,
                })
                const rows = normalizeActivityLogRows(response)
                const meta = normalizeActivityLogMeta(
                    response,
                    activityLogApiParams.page,
                    activityLogApiParams.limit,
                    rows.length,
                )

                if (!isMounted) {
                    return
                }

                setActivityLogRows(rows)
                setTotalItems(meta.total)
                setTotalPages(meta.totalPages)
            } catch (error) {
                if (!isMounted || error?.name === "AbortError") {
                    return
                }

                setActivityLogRows([])
                setTotalItems(0)
                setTotalPages(1)
                setErrorMessage(error?.message || "Gagal memuat activity log.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadActivityLogs()

        return () => {
            isMounted = false
            controller.abort()
        }
    }, [activityLogApiParams, refreshKey])

    const handleFilterChange = (filterKey, nextValue) => {
        setFilters((currentFilters) => ({
            ...currentFilters,
            [filterKey]: nextValue,
        }))
        setCurrentPage(1)
    }

    const handlePageSizeChange = (nextPageSize) => {
        setPageSize(nextPageSize)
        setCurrentPage(1)
    }

    const safeCurrentPage = Math.min(currentPage, totalPages)
    const firstItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
    const lastItem = totalItems === 0 ? 0 : Math.min(firstItem + activityLogRows.length - 1, totalItems)

    const pagination = {
        summary: getPaginationSummary(firstItem, lastItem, totalItems),
        currentPage: safeCurrentPage,
        totalPages,
        items: getPaginationItems(safeCurrentPage, totalPages),
        pageSize,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "Activity logs pagination",
        pageSizeAriaLabel: "Jumlah activity log per halaman",
        onPrevious: () => setCurrentPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setCurrentPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat activity log..."
        : errorMessage || "Belum ada activity log untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-filters" aria-label="Filter activity log">
                    <FilterDropdownBundle
                        className="parent-table-filter"
                        options={actionOptions}
                        value={filters.action}
                        label="Action"
                        placeholder="All Action"
                        searchPlaceholder="Search action..."
                        emptyMessage="Action not found."
                        searchable={false}
                        onChange={(nextValue) => handleFilterChange("action", nextValue)}
                    />
                    <FilterDropdownBundle
                        className="parent-table-filter"
                        options={entityTypeOptions}
                        value={filters.entityType}
                        label="Module"
                        placeholder="All Module"
                        searchPlaceholder="Search module..."
                        emptyMessage="Module not found."
                        onChange={(nextValue) => handleFilterChange("entityType", nextValue)}
                    />
                    <TextFilterInput
                        id="activity-log-entity-id"
                        label="Entity ID"
                        placeholder="Filter entity ID"
                        value={filters.entityId}
                        onChange={(nextValue) => handleFilterChange("entityId", nextValue)}
                    />
                    <TextFilterInput
                        id="activity-log-user-id"
                        label="User ID"
                        placeholder="Filter user ID"
                        value={filters.userId}
                        onChange={(nextValue) => handleFilterChange("userId", nextValue)}
                    />
                    <DateFilterInput
                        id="activity-log-date-from"
                        label="Date From"
                        value={filters.dateFrom}
                        onChange={(nextValue) => handleFilterChange("dateFrom", nextValue)}
                    />
                    <DateFilterInput
                        id="activity-log-date-to"
                        label="Date To"
                        value={filters.dateTo}
                        onChange={(nextValue) => handleFilterChange("dateTo", nextValue)}
                    />
                </div>
            </div>

            <DataTable
                className="mtickets-table activity-log-table"
                rows={activityLogRows}
                columns={columns}
                detail={detailConfig}
                getRowId={(log, index) => log.id ?? `activity-log-${index}`}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />
        </div>
    )
}

export default DataTableLogs
