import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DialogDeleteType from "../../../Dialog/dialog-types/DialogDeleteType.jsx"
import DialogEditType from "../../../Dialog/dialog-types/DialogEditType.jsx"
import ButtonDeleteType from "../../../button/types-buttons/ButtonDeleteType.jsx"
import ButtonEditType from "../../../button/types-buttons/ButtonEditType.jsx"
import ButtonCreateType from "../../../button/types-buttons/ButtonCreateType.jsx"
import ButtonExportMaster from "../../../button/master-buttons/ButtonExportMaster.jsx"
import ButtonImportMaster from "../../../button/master-buttons/ButtonImportMaster.jsx"
import SearchType from "../../../search/SearchType.jsx"
import DataTable, {
    DataTableIdentity,
} from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const DEFAULT_TYPE_PAGE_SIZE = 50
const TYPE_PAGE_SIZE_OPTIONS = [50, 100, 250]
const DEFAULT_TYPE_SORT = "date-desc"

function normalizeTypeRows(responseData) {
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

function getTypeId(Type) {
    return Type?.id ?? Type?.type_id ?? null
}

function formatDisplayValue(value) {
    const displayValue = String(value ?? "").trim()

    return displayValue || "-"
}

function renderTypeValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function matchesSearch(Type, searchQuery) {
    const normalizedQuery = String(searchQuery ?? "").trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    return [
        Type.code,
        Type.Type_code,
        Type.name,
        Type.Type_name,
    ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery))
}

function getTypeDateValue(Type) {
    const dateValue =
        Type.created_at ??
        Type.createdAt ??
        Type.updated_at ??
        Type.updatedAt ??
        Type.date ??
        Type.created_date
    const parsedDate = new Date(dateValue).getTime()

    return Number.isNaN(parsedDate) ? 0 : parsedDate
}

function sortTypeRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstType, secondType) =>
                String(firstType.name ?? firstType.Type_name ?? "").localeCompare(
                    String(secondType.name ?? secondType.Type_name ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "date-asc" ? 1 : -1

    return [...rows].sort((firstType, secondType) => {
        const dateDifference =
            (getTypeDateValue(firstType) - getTypeDateValue(secondType)) * sortDirection

        if (dateDifference !== 0) {
            return dateDifference
        }

        return (
            String(firstType.code ?? firstType.Type_code ?? "").localeCompare(
                String(secondType.code ?? secondType.Type_code ?? ""),
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
        header: "Type Item",
        headerStyle: { width: "36%" },
        cellStyle: { width: "36%" },
        render: (Type) => (
            <DataTableIdentity
                title={Type.name || Type.Type_name || "-"}
                subtitle={Type.code || Type.Type_code || "-"}
            />
        ),
    },
    {
        key: "code",
        header: "Code",
        headerStyle: { width: "22%" },
        cellStyle: { width: "22%" },
        render: (Type) => renderTypeValue(Type.code || Type.Type_code),
    },
]

function DataTableType({
    searchQuery = "",
    onSearchQueryChange,
    tableLabel = "Types table",
    refreshKey = 0,
}) {
    const [TypeRows, setTypeRows] = useState([])
    const [pageSize, setPageSize] = useState(DEFAULT_TYPE_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [activeActionDialog, setActiveActionDialog] = useState(null)
    const [selectedType, setSelectedType] = useState(null)
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
        () => TypeRows.filter((Type) => matchesSearch(Type, searchQuery)),
        [TypeRows, searchQuery],
    )
    const sortedRows = useMemo(
        () => sortTypeRows(filteredRows, DEFAULT_TYPE_SORT),
        [filteredRows],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    const selectedTypeName =
        selectedType?.name || selectedType?.Type_name || selectedType?.code || "Type ini"

    useEffect(() => {
        let isMounted = true

        const loadTypes = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                const response = await api.itemTypes.list()

                if (!isMounted) {
                    return
                }

                setTypeRows(normalizeTypeRows(response))
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setTypeRows([])
                setErrorMessage(error?.message || "Gagal memuat data Type.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadTypes()

        return () => {
            isMounted = false
        }
    }, [refreshKey, reloadKey])

    const closeActionDialog = () => {
        setActiveActionDialog(null)
        setSelectedType(null)
    }

    const openActionDialog = (dialogType, Type) => {
        setSelectedType(Type)
        setActiveActionDialog(dialogType)
    }

    const tableColumns = [
        ...columns,
        {
            key: "action",
            header: "Action",
            headerClassName: "users-table__action-header",
            cellClassName: "users-table__action-cell",
            headerStyle: { width: "24%" },
            cellStyle: { width: "24%", whiteSpace: "nowrap" },
            render: (Type) => (
                <div className="parent-action-buttons">
                    <ButtonEditType
                        title="Edit"
                        aria-label={`Edit ${Type.name || Type.Type_name || "Type"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("edit", Type)
                        }}
                    />
                    <ButtonDeleteType
                        title="Delete"
                        aria-label={`Delete ${Type.name || Type.Type_name || "Type"}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            openActionDialog("delete", Type)
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

    const handleDeleteConfirm = (deletedType = selectedType) => {
        const deletedTypeId = getTypeId(deletedType)

        if (deletedTypeId) {
            setTypeRows((currentRows) =>
                currentRows.filter((Type) => getTypeId(Type) !== deletedTypeId),
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
        pageSizeOptions: TYPE_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "<",
        nextLabel: ">",
        circularButtons: true,
        ariaLabel: "Types pagination",
        pageSizeAriaLabel: "Jumlah data Type per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data Type..."
        : errorMessage || "Belum ada data Type untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <div className="parent-table-toolbar parent-table-toolbar--actions" aria-label="Type table tools">
                <div className="parent-table-toolbar__lookup">
                    <div className="parent-table-toolbar__search">
                        <SearchType
                            value={searchQuery}
                            onChange={onSearchQueryChange}
                        />
                    </div>
                </div>

                <div className="parent-table-actions parent-table-actions--primary">
                    <ButtonCreateType
                        className="parent-table-tool-button parent-table-tool-button--create"
                        aria-label="Create type data"
                        onCreated={() => setReloadKey((currentKey) => currentKey + 1)}
                    >
                        Create
                    </ButtonCreateType>
                    <ButtonExportMaster
                        type="item-sources"
                        masterLabel="Type"
                        className="parent-table-tool-button"
                        aria-label="Export type data"
                    />
                    <ButtonImportMaster
                        type="item-sources"
                        masterLabel="Type"
                        className="parent-table-tool-button"
                        aria-label="Import type data"
                        onImported={() => setReloadKey((currentKey) => currentKey + 1)}
                    />
                </div>
            </div>

            <DataTable
                className="mtickets-table parent-table-grid parent-items-table-grid"
                rows={rows}
                columns={tableColumns}
                getRowId={(Type) => getTypeId(Type) ?? Type.code ?? Type.Type_code}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
                autoHeight={false}
            />

            <DialogEditType
                key={`edit-Type-${getTypeId(selectedType) ?? "empty"}`}
                isOpen={activeActionDialog === "edit"}
                eyebrow="Edit Type"
                title={`Edit ${selectedTypeName}`}
                Type={selectedType}
                onClose={closeActionDialog}
                onEdited={handleEditConfirm}
            />

            <DialogDeleteType
                key={`delete-Type-${getTypeId(selectedType) ?? "empty"}`}
                isOpen={activeActionDialog === "delete"}
                eyebrow="Delete Type"
                title={`Delete ${selectedTypeName}`}
                Type={selectedType}
                onClose={closeActionDialog}
                onDeleted={handleDeleteConfirm}
            />
        </div>
    )
}

export default DataTableType

