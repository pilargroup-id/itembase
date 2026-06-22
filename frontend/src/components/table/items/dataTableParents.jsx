import { useEffect, useMemo, useState } from "react"
import api from "../../../services/api.js"

import DialogDelete from "../../Dialog/DialogDelete.jsx"
import DialogEdit from "../../Dialog/DialogEdit.jsx"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"
import {
DEFAULT_PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
    getPaginationItems,
} from "../../../services/items/DataTableitems.js"

function getParentStatusVariant(status) {
    const normalizedStatus = String(status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "active"
    }

    if (normalizedStatus === "inactive") {
        return "inactive"
    }

    return "pending"
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

function matchesSearch(parent, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        parent.parent_code,
        parent.parent_name,
        parent.item_name,
        parent.sub_brand,
        parent.status,
        parent.brand?.name,
        parent.category?.detail_category,
        parent.category?.sub_category,
        parent.category?.main_category,
        parent.item_type?.name,
        parent.port?.name,
    ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery))
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
        header: "Parent Item",
        cellStyle: { minWidth: "260px" },
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
        cellStyle: { minWidth: "160px" },
        render: (parent) => parent.brand?.name || parent.sub_brand || "-",
    },
    {
        key: "category",
        header: "Category",
        cellStyle: { minWidth: "180px" },
        render: (parent) => parent.category?.detail_category || "-",
    },
    {
        key: "itemType",
        header: "Item Type",
        cellStyle: { whiteSpace: "nowrap", width: "12%" },
        render: (parent) => parent.item_type?.name || "-",
    },
    {
        key: "port",
        header: "Port",
        cellStyle: { whiteSpace: "nowrap", width: "12%" },
        render: (parent) => parent.port?.name || "-",
    },
    {
        key: "status",
        header: "Status",
        cellStyle: { whiteSpace: "nowrap", width: "10%" },
        render: (parent) => (
            <DataTableStatus inline variant={getParentStatusVariant(parent.status)}>
                {parent.status || "-"}
            </DataTableStatus>
        ),
    },
]

function DataTableParents({
    searchQuery = "",
    tableLabel = "Item Parents table",
}) {
    const [parentRows, setParentRows] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedParent, setSelectedParent] = useState(null)

    const filteredRows = useMemo(
        () => parentRows.filter((parent) => matchesSearch(parent, searchQuery)),
        [parentRows, searchQuery],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(filteredRows, currentPage, pageSize),
        [currentPage, filteredRows, pageSize],
    )

    const selectedParentName =
        selectedParent?.parent_name || selectedParent?.item_name || selectedParent?.parent_code || "item ini"
    const dialogParent = selectedParent ? { name: selectedParentName } : null

    useEffect(() => {
        let isMounted = true

        const loadItemParents = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.itemParents.list()

                if (!isMounted) {
                    return
                }

                setParentRows(normalizeParentRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setParentRows([])
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
        }
    }, [])

    useEffect(() => {
        setCurrentPage(1)
    }, [pageSize, searchQuery])

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages))
    }, [totalPages])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedParent(null)
    }

    const openActionDialog = (dialogType, parent) => {
        setSelectedParent(parent)
        setActiveActionDialog(dialogType)
    }

    const handleEditConfirm = () => {
        closeActionDialog()
    }

    const handleDeleteConfirm = () => {
        if (selectedParent?.id) {
            setParentRows((currentRows) =>
                currentRows.filter((parent) => parent.id !== selectedParent.id),
            )
        }

        closeActionDialog()
    }

    const pagination = {
        summary: getPaginationSummary(firstItem, lastItem, filteredRows.length),
        currentPage: safeCurrentPage,
        totalPages,
        items: getPaginationItems(safeCurrentPage, totalPages),
        pageSize,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "Sebelumnya",
        nextLabel: "Berikutnya",
        ariaLabel: "Item parents pagination",
        pageSizeAriaLabel: "Jumlah data item parent per halaman",
        onPrevious: () => setCurrentPage((page) => Math.max(1, page - 1)),
        onNext: () => setCurrentPage((page) => Math.min(totalPages, page + 1)),
        onSelect: (page) => setCurrentPage(page),
        onPageSizeChange: (nextPageSize) => setPageSize(nextPageSize),
    }

    const emptyMessage = isLoading
        ? "Memuat data item parent..."
        : errorMessage || "Belum ada data item parent untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <DataTable
                className="mtickets-table"
                rows={rows}
                columns={columns}
                getRowId={(parent) => parent.id}
                tableLabel={tableLabel}
                detail={{
                    columnLabel: "Detail",
                    buttonLabel: "Detail",
                    eyebrow: "Parent Code",
                    title: (parent) => parent.parent_code || parent.parent_name || "-",
                    description: (parent) => parent.item_name || "-",
                    sections: (parent) => [
                        {
                            title: "Informasi Utama",
                            fields: [
                                { label: "Parent Code", value: parent.parent_code },
                                { label: "Parent Name", value: parent.parent_name },
                                { label: "Item Name", value: parent.item_name },
                                { label: "Sub Brand", value: parent.sub_brand },
                                { label: "Status", value: parent.status },
                            ],
                        },
                        {
                            title: "Relasi Master",
                            fields: [
                                { label: "Brand", value: parent.brand?.name },
                                { label: "Category", value: parent.category?.detail_category },
                                { label: "Sub Category", value: parent.category?.sub_category },
                                { label: "Main Category", value: parent.category?.main_category },
                                { label: "Item Type", value: parent.item_type?.name },
                                { label: "Port", value: parent.port?.name },
                            ],
                        },
                        {
                            title: "Audit",
                            fields: [
                                { label: "Created At", value: parent.created_at },
                                { label: "Updated At", value: parent.updated_at },
                                { label: "Created By", value: parent.created_by },
                                { label: "Updated By", value: parent.updated_by },
                            ],
                        },
                    ],
                }}
                actions={[
                    {
                        key: "edit",
                        label: "Edit",
                        onClick: (parent) => openActionDialog("edit", parent),
                    },
                    {
                        key: "delete",
                        label: "Delete",
                        variant: "danger",
                        onClick: (parent) => openActionDialog("delete", parent),
                    },
                ]}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />

            <DialogEdit
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Item Parent"
                title={`Edit ${selectedParentName}`}
                user={dialogParent}
                onClose={closeActionDialog}
                onConfirm={handleEditConfirm}
            />

            <DialogDelete
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Item Parent"
                title={`Delete ${selectedParentName}`}
                user={dialogParent}
                onClose={closeActionDialog}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    )
}

export default DataTableParents
