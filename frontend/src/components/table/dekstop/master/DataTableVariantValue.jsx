import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const DEFAULT_UOM_PAGE_SIZE = 50
const UOM_PAGE_SIZE_OPTIONS = [50, 100, 250]
const DEFAULT_UOM_SORT = "date-desc"

function normalizeUomRows(responseData) {
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

function getUomId(uom) {
    return uom?.id ?? uom?.uom_id ?? null
}

function getUomStatusValue(uom) {
    if (uom?.is_active !== undefined && uom?.is_active !== null) {
        return Number(uom.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(uom?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

function getUomStatusLabel(uom) {
    const statusValue = getUomStatusValue(uom)

    if (statusValue === "1") {
        return "active"
    }

    if (statusValue === "0") {
        return "inactive"
    }

    return "-"
}

function getUomStatusVariant(uom) {
    const statusValue = getUomStatusValue(uom)

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

function renderUomValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function matchesSearch(uom, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        uom.code,
        uom.uom_code,
        uom.name,
        uom.uom_name,
        uom.attribute_name,
        uom.attribute_code,
        getUomStatusLabel(uom),
    ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery))
}

function getUomDateValue(uom) {
    const dateValue =
        uom.created_at ??
        uom.createdAt ??
        uom.updated_at ??
        uom.updatedAt ??
        uom.date ??
        uom.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortUomRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstUom, secondUom) =>
                String(firstUom.name ?? firstUom.uom_name ?? "").localeCompare(
                    String(secondUom.name ?? secondUom.uom_name ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstUom, secondUom) => {
        const dateDifference =
            (getUomDateValue(firstUom) - getUomDateValue(secondUom)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstUom.code ?? firstUom.uom_code ?? "").localeCompare(
                String(secondUom.code ?? secondUom.uom_code ?? ""),
            ) * sortDirection
        )
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
        header: "Value",
        headerStyle: { width: "28%" },
        cellStyle: { width: "28%" },
        render: (uom) => (
            <DataTableIdentity
                title={uom.name || uom.uom_name || "-"}
                subtitle={uom.code || uom.uom_code || "-"}
            />
        ),
    },
    {
        key: "code",
        header: "Code",
        headerStyle: { width: "18%" },
        cellStyle: { width: "18%" },
        render: (uom) => renderUomValue(uom.code || uom.uom_code),
    },
    {
        key: "attribute",
        header: "Attribute",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (uom) => renderUomValue(uom.attribute_name || uom.attribute_code),
    },
    {
        key: "sort_order",
        header: "Sort",
        headerStyle: { width: "10%" },
        cellStyle: { width: "10%" },
        render: (uom) => renderUomValue(uom.sort_order),
    },
]

function DataTableVariantValue({
    searchQuery = "",
    tableLabel = "Variant Value",
    refreshKey = 0,
}) {
    const [uomRows, setUomRows] = useState([])
    const [sortValue] = useState(DEFAULT_UOM_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_UOM_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const filterResetKey = useMemo(
        () => JSON.stringify({ pageSize, searchQuery, sortValue }),
        [pageSize, searchQuery, sortValue],
    )
    const [paginationState, setPaginationState] = useState({
        currentPage: 1,
        resetKey: filterResetKey,
    })
    const currentPage =
        paginationState.resetKey === filterResetKey ? paginationState.currentPage : 1

    const filteredRows = useMemo(
        () => uomRows.filter((uom) => matchesSearch(uom, searchQuery)),
        [uomRows, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortUomRows(filteredRows, sortValue),
        [filteredRows, sortValue],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    useEffect(() => {
        let isMounted = true

        const loadUoms = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.variantValue.list()

                if (!isMounted) {
                    return
                }

                setUomRows(normalizeUomRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setUomRows([])
                setErrorMessage(error?.message || "Gagal memuat data variant value.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadUoms()

        return () => {
            isMounted = false
        }
    }, [refreshKey])

    const toggleUomStatus = async (uom) => {
        const uomId = getUomId(uom)
        const currentStatus = getUomStatusValue(uom) === "1" ? 1 : 0
        const newStatus = currentStatus === 1 ? 0 : 1
        const previousUomRows = [...uomRows]

        setUomRows((currentRows) =>
            currentRows.map((row) =>
                getUomId(row) === uomId
                    ? { ...row, is_active: newStatus, status: newStatus === 1 ? "active" : "inactive" }
                    : row,
            ),
        )

        try {
            await api.variantValue.updateStatus(uomId, newStatus)
        } catch (error) {
            setUomRows(previousUomRows)
            setErrorMessage(error?.message || "Gagal mengubah status variant value.")
        }
    }

    const tableColumns = [
        ...columns,
        {
            key: "status",
            header: "Status",
            headerStyle: { width: "22%" },
            cellStyle: { width: "22%" },
            render: (uom) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="checkbox"
                        checked={getUomStatusValue(uom) === "1"}
                        onChange={(event) => {
                            event.stopPropagation()
                            toggleUomStatus(uom)
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        title={`Tandai ${uom.name || uom.uom_name || "value"} sebagai ${getUomStatusValue(uom) === "1" ? "non-aktif" : "aktif"}`}
                    />
                    <DataTableStatus inline variant={getUomStatusVariant(uom)}>
                        {getUomStatusLabel(uom)}
                    </DataTableStatus>
                </div>
            ),
        },
    ]

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
            resetKey: JSON.stringify({ pageSize: nextPageSize, searchQuery, sortValue }),
        })
    }

    const pagination = {
        summary: getPaginationSummary(firstItem, lastItem, sortedRows.length),
        currentPage: safeCurrentPage,
        totalPages,
        items: getPaginationItems(safeCurrentPage, totalPages),
        pageSize,
        pageSizeOptions: UOM_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "<",
        nextLabel: ">",
        circularButtons: true,
        ariaLabel: "Variant value pagination",
        pageSizeAriaLabel: "Jumlah data variant value per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data variant value..."
        : errorMessage || "Belum ada data variant value untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <DataTable
                className="mtickets-table"
                rows={rows}
                columns={tableColumns}
                getRowId={(uom) => getUomId(uom) ?? uom.code ?? uom.uom_code}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />

        </div>
    )
}

export default DataTableVariantValue
