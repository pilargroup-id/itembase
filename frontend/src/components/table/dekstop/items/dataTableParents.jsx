import { useEffect, useMemo, useRef, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteParent from "../../../Dialog/dialog-parent/DialogDeleteParent.jsx"
import DialogEditParent from "../../../Dialog/dialog-parent/DialogEditParent.jsx"
import DialogImportParent from "../../../Dialog/dialog-parent/DialogImportParent.jsx"
import ButtonEditParent from "../../../button/parents-buttons/ButtonEditParent.jsx"
import ButtonImportParent from "../../../button/parents-buttons/ButtonImportParent.jsx"
import { Check, ChevronDown, FilterFunnel, SearchMd } from "../../../template/TemplateIcons.jsx"
import FilterDropdownParent from "../../../dropdown/filter-parent/FilterDropdownParent.jsx"
import { parentFilterConfig } from "../../../dropdown/filter-parent/FilterDropdownParent.config.js"
import DataTable, {
    DataTableIdentity,
} from "../DataTable.jsx"
import {
    PAGE_SIZE_OPTIONS,
    getPaginationItems,
} from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_PARENT_SORT = "date-desc"
const DEFAULT_PARENT_PAGE_SIZE = 50
const parentSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
]
const parentFilterGroups = [
    {
        label: "Category",
        keys: ["mainCategory", "subCategory", "detailCategory", "brandCategory"],
    },
    {
        label: "Brand",
        keys: ["brand", "subBrand"],
    },
]
const groupedParentFilterKeys = parentFilterGroups.flatMap((filterGroup) => filterGroup.keys)

const defaultParentFilters = parentFilterConfig.reduce(
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

function renderParentValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function formatParentPorts(parent) {
    const ports = Array.isArray(parent?.ports) && parent.ports.length > 0
        ? parent.ports
        : parent?.port
            ? [parent.port]
            : []

    const portLabels = ports
        .slice()
        .sort((firstPort, secondPort) =>
            Number(firstPort?.sort_order ?? 0) - Number(secondPort?.sort_order ?? 0),
        )
        .map((port) => port?.code || port?.name || port?.port_code || port?.id)
        .filter(Boolean)

    return portLabels.join(", ")
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

function createParentApiParams(filters, searchQuery) {
    const params = {}

    parentFilterConfig.forEach((filterConfig) => {
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

function createPaginatedParentApiParams({
    filters,
    searchQuery,
    currentPage,
    pageSize,
    sortValue,
}) {
    return {
        ...createParentApiParams(filters, searchQuery),
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

    return { firstItem, lastItem }
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

function HierarchicalParentFilterDropdown({
    className = "",
    emptyMessage = "Filter tidak ditemukan.",
    filterGroup,
    filterOptions = {},
    filters = {},
    filtersByKey = {},
    onChange,
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const rootRef = useRef(null)
    const searchInputRef = useRef(null)
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    const selectedFilterKey = filterGroup.keys.find((filterKey) => {
        const selectedValue = String(filters[filterKey] ?? "")

        return selectedValue && selectedValue.toLowerCase() !== ALL_FILTER_VALUE
    })
    const selectedFilterConfig = selectedFilterKey ? filtersByKey[selectedFilterKey] : null
    const selectedOption = selectedFilterKey
        ? filterOptions[selectedFilterKey]?.find(
            (option) => String(option.value) === String(filters[selectedFilterKey]),
        )
        : null
    const hasActiveValue = Boolean(selectedFilterConfig && selectedOption)
    const displayValue = hasActiveValue
        ? `${selectedFilterConfig.label}: ${selectedOption.label}`
        : `All ${filterGroup.label}`
    const sectionItems = useMemo(
        () =>
            filterGroup.keys
                .map((filterKey) => {
                    const filterConfig = filtersByKey[filterKey]

                    if (!filterConfig) {
                        return null
                    }

                    const options = (filterOptions[filterKey] ?? []).filter(
                        (option) => String(option.value).toLowerCase() !== ALL_FILTER_VALUE,
                    )
                    const filteredOptions = normalizedSearchQuery
                        ? options.filter((option) =>
                            [
                                filterConfig.label,
                                option.label,
                                option.value,
                            ]
                                .filter(Boolean)
                                .join(" ")
                                .toLowerCase()
                                .includes(normalizedSearchQuery),
                        )
                        : options

                    return {
                        filterConfig,
                        options: filteredOptions,
                    }
                })
                .filter(Boolean)
                .filter((section) => section.options.length > 0),
        [filterGroup.keys, filterOptions, filtersByKey, normalizedSearchQuery],
    )

    useEffect(() => {
        if (!isOpen) {
            return undefined
        }

        const closeDropdown = () => {
            setIsOpen(false)
            setSearchQuery("")
        }

        const handlePointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                closeDropdown()
            }
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                closeDropdown()
            }
        }

        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen) {
            searchInputRef.current?.focus()
        }
    }, [isOpen])

    const handleToggle = () => {
        if (isOpen) {
            setSearchQuery("")
        }

        setIsOpen((currentState) => !currentState)
    }

    const handleReset = () => {
        onChange?.(filterGroup.keys, null, ALL_FILTER_VALUE)
        setIsOpen(false)
        setSearchQuery("")
    }

    const handleSelect = (filterKey, nextValue) => {
        onChange?.(filterGroup.keys, filterKey, nextValue)
        setIsOpen(false)
        setSearchQuery("")
    }

    return (
        <div
            ref={rootRef}
            className={["year-dropdown-tp", "brand-filter-dropdown", "parent-hierarchical-filter", className]
                .filter(Boolean)
                .join(" ")}
        >
            <button
                type="button"
                className={[
                    "year-dropdown-tp__trigger",
                    "year-dropdown-tp__trigger--floating",
                    "year-dropdown-tp__trigger--outlined",
                    isOpen ? "year-dropdown-tp__trigger--open" : "",
                    isOpen || hasActiveValue ? "year-dropdown-tp__trigger--has-value" : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <FilterFunnel size={14} aria-hidden="true" />

                <span className="year-dropdown-tp__copy year-dropdown-tp__copy--floating">
                    <span
                        className={[
                            "year-dropdown-tp__label",
                            "year-dropdown-tp__label--floating",
                            "year-dropdown-tp__label--outlined",
                            "year-dropdown-tp__label--raised",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                        {filterGroup.label}
                    </span>
                    <span className="year-dropdown-tp__value">{displayValue}</span>
                </span>

                <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`year-dropdown-tp__chevron${isOpen ? " year-dropdown-tp__chevron--open" : ""}`}
                />
            </button>

            {isOpen ? (
                <div className="year-dropdown-tp__menu parent-hierarchical-filter__menu" role="listbox" aria-label={filterGroup.label}>
                    <div className="brand-filter-dropdown__search-shell">
                        <SearchMd
                            size={15}
                            className="brand-filter-dropdown__search-icon"
                            aria-hidden="true"
                        />
                        <input
                            ref={searchInputRef}
                            type="search"
                            className="brand-filter-dropdown__search-input"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder={`Cari ${filterGroup.label.toLowerCase()}...`}
                            aria-label={`Cari ${filterGroup.label}`}
                        />
                    </div>

                    <div className="brand-filter-dropdown__options parent-hierarchical-filter__options">
                        <button
                            type="button"
                            role="option"
                            aria-selected={!hasActiveValue}
                            className={[
                                "year-dropdown-tp__option",
                                "parent-hierarchical-filter__reset",
                                !hasActiveValue ? "year-dropdown-tp__option--selected" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            onClick={handleReset}
                        >
                            <span className="year-dropdown-tp__option-label">{`All ${filterGroup.label}`}</span>
                            {!hasActiveValue ? (
                                <Check
                                    size={14}
                                    className="year-dropdown-tp__option-check"
                                    aria-hidden="true"
                                />
                            ) : null}
                        </button>

                        {sectionItems.length > 0 ? (
                            sectionItems.map(({ filterConfig, options }) => (
                                <div key={filterConfig.key} className="parent-hierarchical-filter__section">
                                    <div className="parent-hierarchical-filter__section-label">
                                        {filterConfig.label}
                                    </div>
                                    <div className="parent-hierarchical-filter__section-options">
                                        {options.map((option) => {
                                            const isSelected =
                                                selectedFilterKey === filterConfig.key &&
                                                String(option.value) === String(filters[filterConfig.key])

                                            return (
                                                <button
                                                    key={`${filterConfig.key}-${option.value}`}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    className={[
                                                        "year-dropdown-tp__option",
                                                        "parent-hierarchical-filter__option",
                                                        isSelected ? "year-dropdown-tp__option--selected" : "",
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" ")}
                                                    onClick={() => handleSelect(filterConfig.key, option.value)}
                                                >
                                                    <span className="year-dropdown-tp__option-label">{option.label}</span>
                                                    {isSelected ? (
                                                        <Check
                                                            size={14}
                                                            className="year-dropdown-tp__option-check"
                                                            aria-hidden="true"
                                                        />
                                                    ) : null}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="brand-filter-dropdown__empty">{emptyMessage}</div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    )
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
        header: "Item Source",
        headerStyle: { width: "7%" },
        cellStyle: { width: "7%" },
        render: (parent) => renderParentValue(parent.item_type?.name),
    },
    {
        key: "port",
        header: "Port",
        headerStyle: { width: "6%" },
        cellStyle: { width: "6%" },
        render: (parent) => renderParentValue(formatParentPorts(parent)),
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
    const [pageSize, setPageSize] = useState(DEFAULT_PARENT_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [totalParents, setTotalParents] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedParent, setSelectedParent] = useState(null)
    const [importPreviewResponse, setImportPreviewResponse] = useState(null)
    const [importFileName, setImportFileName] = useState("")
    const [importErrorMessage, setImportErrorMessage] = useState("")
    const [isImportPreviewing, setIsImportPreviewing] = useState(false)
    const [importDialogKey, setImportDialogKey] = useState(0)
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
            parentFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(parentRows, filterConfig),
                }),
                {},
            ),
        [parentRows],
    )
    const filtersByKey = useMemo(
        () =>
            parentFilterConfig.reduce(
                (configs, filterConfig) => ({
                    ...configs,
                    [filterConfig.key]: filterConfig,
                }),
                {},
            ),
        [],
    )
    const standaloneFilterConfigs = useMemo(
        () =>
            parentFilterConfig.filter(
                (filterConfig) => !groupedParentFilterKeys.includes(filterConfig.key),
            ),
        [],
    )
    const parentApiParams = useMemo(
        () =>
            createPaginatedParentApiParams({
                filters,
                searchQuery: debouncedSearchQuery,
                currentPage,
                pageSize,
                sortValue,
            }),
        [currentPage, debouncedSearchQuery, filters, pageSize, sortValue],
    )
    const safeCurrentPage = Math.min(currentPage, totalPages)
    const rows = parentRows
    const { firstItem, lastItem } = useMemo(
        () => getServerPageSummary(rows.length, safeCurrentPage, pageSize, totalParents),
        [pageSize, rows.length, safeCurrentPage, totalParents],
    )

    const selectedParentName =
        selectedParent?.parent_name || selectedParent?.item_name || selectedParent?.parent_code || "item ini"
    const dialogParent = selectedParent ? { name: selectedParentName } : null

    useEffect(() => {
        let isMounted = true
        const controller = new AbortController()

        const loadItemParents = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.itemParents.list(parentApiParams, { signal: controller.signal })
                const parentRows = normalizeParentRows(response)
                const meta = getPaginationMeta(response, parentRows)

                if (!isMounted) {
                    return
                }

                setParentRows(parentRows)
                setTotalParents(meta.total)
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

                setParentRows([])
                setTotalParents(0)
                setTotalPages(1)
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
            controller.abort()
        }
    }, [filterResetKey, parentApiParams, refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedParent(null)
    }

    const closeImportDialog = () => {
        setActiveActionDialog(null)
        setImportPreviewResponse(null)
        setImportFileName("")
        setImportErrorMessage("")
        setIsImportPreviewing(false)
    }

    const openActionDialog = (dialogType, parent) => {
        setSelectedParent(parent)
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
            const previewResponse = await api.itemData.imports.parentsPreview(formData)

            setImportPreviewResponse(previewResponse)
        } catch (error) {
            setImportErrorMessage(error?.message || "Gagal membuat preview import parent.")
        } finally {
            setIsImportPreviewing(false)
        }
    }

    const handleImportCommitted = () => {
        setReloadKey((currentKey) => currentKey + 1)
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
        if (filters[filterKey] === nextValue) {
            return
        }

        setFilters((currentFilters) => ({
            ...currentFilters,
            [filterKey]: nextValue,
        }))
    }

    const handleHierarchicalFilterChange = (filterKeys, activeFilterKey, nextValue) => {
        setFilters((currentFilters) => ({
            ...currentFilters,
            ...filterKeys.reduce(
                (resetFilters, filterKey) => ({
                    ...resetFilters,
                    [filterKey]: filterKey === activeFilterKey
                        ? nextValue
                        : ALL_FILTER_VALUE,
                }),
                {},
            ),
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

    const loadingPageMessage = `Memuat data item parent halaman ${currentPage}...`
    const paginationSummary = isLoading
        ? `Memuat halaman ${currentPage} dari ${totalPages}`
        : getPaginationSummary(firstItem, lastItem, totalParents)

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
        ariaLabel: "Item parents pagination",
        pageSizeAriaLabel: "Jumlah data item parent per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? loadingPageMessage
        : errorMessage || "Belum ada data item parent untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-backdrop" aria-label="Parent table tools">
                <div className="parent-table-actions">
                    <ButtonImportParent
                        aria-label="Import parent data"
                        onClick={openImportDialog}
                    />
                </div>

                <div className="parent-table-filters" aria-label="Filter item parent">
                    <FilterDropdownParent
                        className="parent-table-filter parent-table-filter--sort"
                        options={parentSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Sort By"
                        searchable={false}
                        onChange={handleSortChange}
                    />
                    {standaloneFilterConfigs.map((filterConfig) => (
                        <FilterDropdownParent
                            key={filterConfig.key}
                            className="parent-table-filter"
                            options={filterOptions[filterConfig.key]}
                            value={filters[filterConfig.key]}
                            label={filterConfig.label}
                            placeholder={filterConfig.placeholder}
                            searchPlaceholder={filterConfig.searchPlaceholder}
                            emptyMessage={filterConfig.emptyMessage}
                            searchable={filterConfig.searchable ?? true}
                            onChange={(nextValue) => handleFilterChange(filterConfig.key, nextValue)}
                        />
                    ))}
                    {parentFilterGroups.map((filterGroup) => (
                        <div
                            key={filterGroup.label}
                            className="parent-table-filter-group"
                        >
                            <HierarchicalParentFilterDropdown
                                className="parent-table-filter parent-table-filter--grouped"
                                filterGroup={filterGroup}
                                filterOptions={filterOptions}
                                filters={filters}
                                filtersByKey={filtersByKey}
                                onChange={handleHierarchicalFilterChange}
                            />
                        </div>
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

            <DialogImportParent
                key={`import-parent-${importDialogKey}`}
                isOpen={activeActionDialog === "import"}
                eyebrow="Import Item Parent"
                title="Preview Import Parent"
                fileName={importFileName}
                previewResponse={importPreviewResponse}
                errorMessage={importErrorMessage}
                isPreviewing={isImportPreviewing}
                onClose={closeImportDialog}
                onCommitted={handleImportCommitted}
                onFileSelect={handleImportFileSelect}
            />
        </div>
    )
}

export default DataTableParents
