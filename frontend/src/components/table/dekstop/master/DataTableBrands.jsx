import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteBrand from "../../../Dialog/dialog-brands/DialogDeleteBrand.jsx"
import DialogEditBrand from "../../../Dialog/dialog-brands/DialogEditBrand.jsx"
import DialogValidateStatusMaster from "../../../Dialog/dialog-master/DialogValidateStatusMaster.jsx"
import ButtonDeleteBrand from "../../../button/brands-buttons/ButtonDeleteBrand.jsx"
import ButtonEditBrand from "../../../button/brands-buttons/ButtonEditBrand.jsx"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const DEFAULT_BRAND_PAGE_SIZE = 50
const BRAND_PAGE_SIZE_OPTIONS = [50, 100, 250]
const DEFAULT_BRAND_SORT = "date-desc"

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

function getBrandChannels(brand) {
    return Array.isArray(brand?.channels) ? brand.channels : []
}

function formatBrandBusinessUnits(brand) {
    const businessUnits = getBrandChannels(brand)
        .map((channel) =>
            formatDisplayValue(
                channel.business_unit?.name ??
                    channel.business_unit?.code ??
                    channel.business_unit_name ??
                    channel.business_unit_code,
            ),
        )
        .filter((value) => value !== "-")

    if (businessUnits.length > 0) {
        return Array.from(new Set(businessUnits)).join(", ")
    }

    return formatDisplayValue(
        brand?.business_unit?.name ??
            brand?.business_unit?.code ??
            brand?.businessUnit ??
            brand?.business_unit,
    )
}

function formatBrandChannels(brand) {
    const channels = getBrandChannels(brand)
        .map((channel) =>
            formatDisplayValue(
                channel.channel_name ??
                    channel.channel_code ??
                    channel.department?.name ??
                    channel.department?.code,
            ),
        )
        .filter((value) => value !== "-")

    if (channels.length > 0) {
        return Array.from(new Set(channels)).join(", ")
    }

    return formatDisplayValue(brand?.channel_name ?? brand?.channel_code)
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
        formatBrandBusinessUnits(brand),
        formatBrandChannels(brand),
        getBrandStatusLabel(brand),
    ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery))
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
    {
        key: "businessUnit",
        header: "Business Unit",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (brand) => renderBrandValue(formatBrandBusinessUnits(brand)),
    },
    {
        key: "channelName",
        header: "Channel Name",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (brand) => renderBrandValue(formatBrandChannels(brand)),
    },
]

function DataTableBrands({
    searchQuery = "",
    tableLabel = "Brands table",
    refreshKey = 0,
}) {
    const [brandRows, setBrandRows] = useState([])
    const [pageSize, setPageSize] = useState(DEFAULT_BRAND_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedBrand, setSelectedBrand] = useState(null)
    const [reloadKey, setReloadKey] = useState(0)
    const filterResetKey = useMemo(
        () => JSON.stringify({ pageSize, searchQuery }),
        [pageSize, searchQuery],
    )
    const [paginationState, setPaginationState] = useState({
        currentPage: 1,
        resetKey: filterResetKey,
    })
    const currentPage =
        paginationState.resetKey === filterResetKey ? paginationState.currentPage : 1

    const filteredRows = useMemo(
        () => brandRows.filter((brand) => matchesSearch(brand, searchQuery)),
        [brandRows, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortBrandRows(filteredRows, DEFAULT_BRAND_SORT),
        [filteredRows],
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

    const handleConfirmStatusChange = async (brand, newStatus) => {
        const brandId = getBrandId(brand)

        await api.brands.updateStatus(brandId, newStatus)

        setBrandRows((currentRows) =>
            currentRows.map((row) =>
                getBrandId(row) === brandId
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
            headerStyle: { width: "18%" },
            cellStyle: { width: "18%" },
            render: (brand) => (
                <div className="item-table__status-cell" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label
                        className="users-table__toggle item-table__status-toggle"
                        onClick={(event) => event.stopPropagation()}
                        title={`Tandai ${brand.name || brand.brand_name || "brand"} sebagai ${getBrandStatusValue(brand) === "1" ? "non-aktif" : "aktif"}`}
                    >
                        <input
                            type="checkbox"
                            checked={getBrandStatusValue(brand) === "1"}
                            onChange={() => openActionDialog("status", brand)}
                        />
                        <span className="users-table__toggle-track" aria-hidden="true" />
                        <span className="users-table__toggle-thumb" aria-hidden="true" />
                    </label>
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
            resetKey: JSON.stringify({ pageSize: nextPageSize, searchQuery }),
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
        previousLabel: "<",
        nextLabel: ">",
        circularButtons: true,
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

            <DialogValidateStatusMaster
                key={`status-brand-${getBrandId(selectedBrand) ?? "empty"}`}
                isOpen={activeActionDialog === "status"}
                eyebrow="Ubah Status Brand"
                title="Konfirmasi Perubahan Status"
                entity={selectedBrand}
                displayName={selectedBrandName}
                onClose={closeActionDialog}
                onConfirm={handleConfirmStatusChange}
            />
        </div>
    )
}

export default DataTableBrands
