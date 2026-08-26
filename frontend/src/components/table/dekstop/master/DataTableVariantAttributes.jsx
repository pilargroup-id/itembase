import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogValidateStatusMaster from "../../../Dialog/dialog-master/DialogValidateStatusMaster.jsx"
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
        header: "Attribute",
        headerStyle: { width: "36%" },
        cellStyle: { width: "36%" },
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
        headerStyle: { width: "28%" },
        cellStyle: { width: "28%" },
        render: (uom) => renderUomValue(uom.code || uom.uom_code),
    },
]

function DataTableVariantAttributes({
    searchQuery = "",
    tableLabel = "Variant table",
    refreshKey = 0,
}) {
    const [uomRows, setUomRows] = useState([])
    const [sortValue] = useState(DEFAULT_UOM_SORT)
    const [pageSize, setPageSize] = useState(DEFAULT_UOM_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedUom, setSelectedUom] = useState(null)
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

    const selectedUomName =
        selectedUom?.name || selectedUom?.uom_name || selectedUom?.code || "attribute ini"

    useEffect(() => {
        let isMounted = true

        const loadUoms = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.variantAttributes.list()

                if (!isMounted) {
                    return
                }

                setUomRows(normalizeUomRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setUomRows([])
                setErrorMessage(error?.message || "Gagal memuat data variant attribute.")
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

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedUom(null)
    }

    const openActionDialog = (dialogType, uom) => {
        setSelectedUom(uom)
        setActiveActionDialog(dialogType)
    }

    const handleConfirmStatusChange = async (uom, newStatus) => {
        const uomId = getUomId(uom)

        await api.variantAttributes.updateStatus(uomId, newStatus)

        setUomRows((currentRows) =>
            currentRows.map((row) =>
                getUomId(row) === uomId
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
            headerStyle: { width: "36%" },
            cellStyle: { width: "36%" },
            render: (uom) => (
                <div className="item-table__status-cell" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label
                        className="users-table__toggle item-table__status-toggle"
                        onClick={(event) => event.stopPropagation()}
                        title={`Tandai ${uom.name || uom.uom_name || "attribute"} sebagai ${getUomStatusValue(uom) === "1" ? "non-aktif" : "aktif"}`}
                    >
                        <input
                            type="checkbox"
                            checked={getUomStatusValue(uom) === "1"}
                            onChange={() => openActionDialog("status", uom)}
                        />
                        <span className="users-table__toggle-track" aria-hidden="true" />
                        <span className="users-table__toggle-thumb" aria-hidden="true" />
                    </label>
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
        ariaLabel: "Variant attribute pagination",
        pageSizeAriaLabel: "Jumlah data variant attribute per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data variant attribute..."
        : errorMessage || "Belum ada data variant attribute untuk ditampilkan."

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

            <DialogValidateStatusMaster
                key={`status-attribute-${getUomId(selectedUom) ?? "empty"}`}
                isOpen={activeActionDialog === "status"}
                eyebrow="Ubah Status Variant Attribute"
                title="Konfirmasi Perubahan Status"
                entity={selectedUom}
                displayName={selectedUomName}
                onClose={closeActionDialog}
                onConfirm={handleConfirmStatusChange}
            />
        </div>
    )
}

export default DataTableVariantAttributes
