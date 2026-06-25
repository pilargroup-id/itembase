import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeletePort from "../../../Dialog/dialog-ports/DialogDeletePort.jsx"
import DialogEditPort from "../../../Dialog/dialog-ports/DialogEditPort.jsx"
import ButtonDeletePort from "../../../button/ports-buttons/ButtonDeletePort.jsx"
import ButtonEditPort from "../../../button/ports-buttons/ButtonEditPort.jsx"
import FilterDropdownPort from "../../../dropdown/filter-port/FilterDropdownPort.jsx"
import { PortFilterConfig } from "../../../dropdown/filter-port/FilterDropdownPort.config.js"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const ALL_FILTER_VALUE = "all"
const DEFAULT_PORT_PAGE_SIZE = 25
const PORT_PAGE_SIZE_OPTIONS = [25, 50, 100]
const DEFAULT_PORT_SORT = "date-desc"
const portSortOptions = [
    { value: "date-desc", label: "Date Desc" },
    { value: "date-asc", label: "Date Asc" },
    { value: "name-asc", label: "Name Asc" },
    { value: "name-desc", label: "Name Desc" },
]

const defaultPortFilters = PortFilterConfig.reduce(
    (filters, filterConfig) => ({
        ...filters,
        [filterConfig.key]: ALL_FILTER_VALUE,
    }),
    {},
)

function normalizePortRows(responseData) {
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

function getPortId(Port) {
    return Port?.id ?? Port?.port_id ?? null
}

function getPortStatusValue(Port) {
    if (Port?.is_active !== undefined && Port?.is_active !== null) {
        return Number(Port.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(Port?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

function getPortStatusLabel(Port) {
    const statusValue = getPortStatusValue(Port)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "-"
}

function getPortStatusVariant(Port) {
    const statusValue = getPortStatusValue(Port)

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

function renderPortValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function matchesSearch(Port, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        Port.code,
        Port.Port_code,
        Port.name,
        Port.Port_name,
        getPortStatusLabel(Port),
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

    rows.forEach((Port) => {
        const customOption = filterConfig.getOption?.(Port)

        if (customOption?.value) {
            uniqueOptions.set(String(customOption.value), {
                value: String(customOption.value),
                label: String(customOption.label ?? customOption.value),
            })
            return
        }

        const value = normalizeFilterValue(filterConfig.getValue(Port))

        if (value) {
            uniqueOptions.set(value, { value, label: value })
        }
    })

    const options = Array.from(uniqueOptions.values()).sort((firstOption, secondOption) =>
        firstOption.label.localeCompare(secondOption.label),
    )

    return [{ value: ALL_FILTER_VALUE, label: filterConfig.placeholder }, ...options]
}

function getPortDateValue(Port) {
    const dateValue =
        Port.created_at ??
        Port.createdAt ??
        Port.updated_at ??
        Port.updatedAt ??
        Port.date ??
        Port.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortPortRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstPort, secondPort) =>
                String(firstPort.name ?? firstPort.Port_name ?? "").localeCompare(
                    String(secondPort.name ?? secondPort.Port_name ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstPort, secondPort) => {
        const dateDifference =
            (getPortDateValue(firstPort) - getPortDateValue(secondPort)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstPort.code ?? firstPort.Port_code ?? "").localeCompare(
                String(secondPort.code ?? secondPort.Port_code ?? ""),
            ) * sortDirection
        )
    })
}

function matchesPortFilters(port, filters) {
    return PortFilterConfig.every((filterConfig) => {
        const selectedValue = filters[filterConfig.key]

        if (!selectedValue || selectedValue === ALL_FILTER_VALUE) {
            return true
        }

        return normalizeFilterValue(filterConfig.getValue(Port)) === selectedValue
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
        header: "Port Item",
        headerStyle: { width: "36%" },
        cellStyle: { width: "36%" },
        render: (Port) => (
            <DataTableIdentity
                title={Port.name || Port.Port_name || "-"}
                subtitle={Port.code || Port.Port_code || "-"}
            />
        ),
    },
    {
        key: "code",
        header: "Code",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (Port) => renderPortValue(Port.code || Port.Port_code),
    },
]

function DataTablePorts({
    searchQuery = "",
    tableLabel = "Ports table",
    refreshKey = 0,
}) {
    const [PortRows, setPortRows] = useState([])
    const [filters, setFilters] = useState(defaultPortFilters)
    const [sortValue, setSortValue] = useState(DEFAULT_PORT_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_PORT_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedPort, setSelectedPort] = useState(null)
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
            PortFilterConfig.reduce(
                (options, filterConfig) => ({
                    ...options,
                    [filterConfig.key]: createFilterOptions(PortRows, filterConfig),
                }),
                {},
            ),
        [PortRows],
    )
    const filteredRows = useMemo(
        () =>
            PortRows.filter(
                (Port) => matchesSearch(Port, searchQuery) && matchesPortFilters(Port, filters),
            ),
        [PortRows, filters, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortPortRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedPortName =
        selectedPort?.name || selectedPort?.Port_name || selectedPort?.code || "Port ini"

    useEffect(() => {
        let isMounted = true

        const loadPorts = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.ports.list()

                if (!isMounted) {
                    return
                }

                setPortRows(normalizePortRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setPortRows([])
                setErrorMessage(error?.message || "Gagal memuat data Port.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadPorts()

        return () => {
            isMounted = false
        }
    }, [refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedPort(null)
    }

    const openActionDialog = (dialogPort, Port) => {
        setSelectedPort(Port)
        setActiveActionDialog(dialogPort)
    }

    const togglePortStatus = async (Port) => {
        const PortId = getPortId(Port)
        const currentStatus = getPortStatusValue(Port) === "1" ? 1 : 0
        const newStatus = currentStatus === 1 ? 0 : 1
        const previousPortRows = [...PortRows]

        setPortRows((currentRows) =>
            currentRows.map((row) =>
                getPortId(row) === PortId
                    ? { ...row, is_active: newStatus, status: newStatus === 1 ? "active" : "inactive" }
                    : row,
            ),
        )

        try {
            await api.ports.updateStatus(PortId, newStatus)
        } catch (error) {
            setPortRows(previousPortRows)
            setErrorMessage(error?.message || "Gagal mengubah status Port.")
        }
    }

    const tableColumns = [
        ...columns,
        {
            key: "status",
            header: "Status",
            headerStyle: { width: "18%" },
            cellStyle: { width: "18%" },
            render: (Port) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="checkbox"
                        checked={getPortStatusValue(Port) === "1"}
                        onChange={(event) => {
                            event.stopPropagation()
                            togglePortStatus(Port)
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        title={`Tandai ${Port.name || Port.Port_name || "Port"} sebagai ${getPortStatusValue(Port) === "1" ? "non-aktif" : "aktif"}`}
                    />
                    <DataTableStatus inline variant={getPortStatusVariant(Port)}>
                        {getPortStatusLabel(Port)}
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
            render: (Port) => (
                <div className="parent-action-buttons">
                    <ButtonEditPort
                        title="Edit"
                        aria-label={`Edit ${Port.name || Port.Port_name || "Port"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", Port)
                        }}
                    />
                    <ButtonDeletePort
                        title="Delete"
                        aria-label={`Delete ${Port.name || Port.Port_name || "Port"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("delete", Port)
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

    const handleDeleteConfirm = (deletedPort = selectedPort) => {
        const deletedPortId = getPortId(deletedPort)

        if (deletedPortId) {
            setPortRows((currentRows) =>
                currentRows.filter((Port) => getPortId(Port) !== deletedPortId),
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
        pageSizeOptions: PORT_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "Ports pagination",
        pageSizeAriaLabel: "Jumlah data Port per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data Port..."
        : errorMessage || "Belum ada data Port untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar">
                <div className="parent-table-filters" aria-label="Filter Port">
                    <FilterDropdownPort
                        className="parent-table-filter parent-table-filter--sort"
                        options={portSortOptions}
                        value={sortValue}
                        label="Sort By"
                        placeholder="Date Desc"
                        searchable={false}
                        onChange={setSortValue}
                    />
                    {PortFilterConfig.map((filterConfig) => (
                        <FilterDropdownPort
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
                getRowId={(Port) => getPortId(Port) ?? Port.code ?? Port.Port_code}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />

            <DialogEditPort
                key={`edit-Port-${getPortId(selectedPort) ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Port"
                title={`Edit ${selectedPortName}`}
                Port={selectedPort}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeletePort
                key={`delete-Port-${getPortId(selectedPort) ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Port"
                title={`Delete ${selectedPortName}`}
                Port={selectedPort}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />
        </div>
    )
}

export default DataTablePorts
