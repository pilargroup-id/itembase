import { useEffect, useMemo, useState } from "react"
import api from "../../../../services/api.js"

import DataTable, { DataTableIdentity } from "../DataTable.jsx"
import { getPaginationItems } from "../../../../services/items/DataTableitems.js"

const DEFAULT_SUB_BRAND_PAGE_SIZE = 50
const SUB_BRAND_PAGE_SIZE_OPTIONS = [50, 100, 250]
const DEFAULT_SUB_BRAND_SORT = "score-desc"
const SUB_BRAND_SUGGESTION_LIMIT = 200
const SUB_BRAND_LIST_LIMIT = 100
const SUB_BRAND_MIN_SCORE = 35

function normalizeSubBrandRows(responseData) {
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

function normalizeItemParentSubBrandRows(responseData) {
    return normalizeSubBrandRows(responseData)
        .map((parent) => ({
            subbrand_id: parent.subbrand_id || parent.subbrand?.id || "",
            sub_brand: parent.sub_brand || parent.subbrand?.name || "",
            parent_name: parent.parent_name || parent.item_name || parent.parent_code || "",
            score: parent.score ?? null,
        }))
        .filter((subBrand) => subBrand.sub_brand || subBrand.parent_name)
}

function getSubBrandId(subBrand, index = 0) {
    return [
        subBrand?.subbrand_id,
        subBrand?.sub_brand,
        subBrand?.parent_name,
        index,
    ]
        .filter((value) => value !== undefined && value !== null && value !== "")
        .join("-")
}

function formatDisplayValue(value) {
    const displayValue = String(value ?? "").trim()

    return displayValue || "-"
}

function renderSubBrandValue(value) {
    const displayValue = formatDisplayValue(value)

    return (
        <span className="parent-table-value" title={displayValue}>
            {displayValue}
        </span>
    )
}

function formatScore(score) {
    if (score === undefined || score === null || score === "") {
        return "-"
    }

    const numericScore = Number(score)

    if (Number.isNaN(numericScore)) {
        return String(score)
    }

    return Number.isInteger(numericScore) ? String(numericScore) : numericScore.toFixed(2)
}

function sortSubBrandRows(rows, sortValue) {
    if (sortValue === "name-asc" || sortValue === "name-desc") {
        const sortDirection = sortValue === "name-asc" ? 1 : -1

        return [...rows].sort(
            (firstSubBrand, secondSubBrand) =>
                String(firstSubBrand.sub_brand ?? "").localeCompare(
                    String(secondSubBrand.sub_brand ?? ""),
                ) * sortDirection,
        )
    }

    const sortDirection = sortValue === "score-asc" ? 1 : -1

    return [...rows].sort((firstSubBrand, secondSubBrand) => {
        const scoreDifference =
            (Number(firstSubBrand.score ?? 0) - Number(secondSubBrand.score ?? 0)) *
            sortDirection

        if (scoreDifference !== 0) {
            return scoreDifference
        }

        return String(firstSubBrand.sub_brand ?? "").localeCompare(
            String(secondSubBrand.sub_brand ?? ""),
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
        header: "Sub Brand",
        headerStyle: { width: "34%" },
        cellStyle: { width: "34%" },
        render: (subBrand) => (
            <DataTableIdentity
                title={subBrand.sub_brand || "-"}
                subtitle={subBrand.subbrand_id || "-"}
            />
        ),
    },
    {
        key: "parent_name",
        header: "Parent Name",
        headerStyle: { width: "46%" },
        cellStyle: { width: "46%" },
        render: (subBrand) => renderSubBrandValue(subBrand.parent_name),
    },
]

function DataTableSubBrands({
    searchQuery = "",
    tableLabel = "Sub Brands table",
    refreshKey = 0,
}) {
    const [subBrandRows, setSubBrandRows] = useState([])
    const [pageSize, setPageSize] = useState(DEFAULT_SUB_BRAND_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
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

    const sortedRows = useMemo(
        () => sortSubBrandRows(subBrandRows, DEFAULT_SUB_BRAND_SORT),
        [subBrandRows],
    )
    const { totalPages, safeCurrentPage, rows, firstItem, lastItem } = useMemo(
        () => getPageRows(sortedRows, currentPage, pageSize),
        [currentPage, pageSize, sortedRows],
    )

    useEffect(() => {
        const input = String(searchQuery ?? "").trim()
        let isMounted = true

        const loadSubBrands = async () => {
            setIsLoading(true)
            setErrorMessage("")

            try {
                let nextRows = []

                if (input) {
                    const response = await api.subBrands.suggestions({
                        input,
                        limit: SUB_BRAND_SUGGESTION_LIMIT,
                        min_score: SUB_BRAND_MIN_SCORE,
                    })

                    nextRows = normalizeSubBrandRows(response)
                }

                if (nextRows.length === 0) {
                    const response = await api.itemParents.list({
                        search: input,
                        limit: SUB_BRAND_LIST_LIMIT,
                    })

                    nextRows = normalizeItemParentSubBrandRows(response)
                }

                if (!isMounted) {
                    return
                }

                setSubBrandRows(nextRows)
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setSubBrandRows([])
                setErrorMessage(error?.message || "Gagal memuat data sub brand.")
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        const debounceId = window.setTimeout(loadSubBrands, 300)

        return () => {
            isMounted = false
            window.clearTimeout(debounceId)
        }
    }, [searchQuery, refreshKey])

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
        pageSizeOptions: SUB_BRAND_PAGE_SIZE_OPTIONS,
        pageSizeLabel: "Tampilkan",
        pageSizeSuffix: "baris",
        previousLabel: "<",
        nextLabel: ">",
        circularButtons: true,
        ariaLabel: "Sub brands pagination",
        pageSizeAriaLabel: "Jumlah data sub brand per halaman",
        onPrevious: () => setPaginationPage(Math.max(1, safeCurrentPage - 1)),
        onNext: () => setPaginationPage(Math.min(totalPages, safeCurrentPage + 1)),
        onSelect: setPaginationPage,
        onPageSizeChange: handlePageSizeChange,
    }

    const emptyMessage = isLoading
        ? "Memuat data sub brand..."
        : errorMessage || "Belum ada data sub brand untuk ditampilkan."

    return (
        <div className="mtickets-table-shell parent-table-shell">
            <DataTable
                className="mtickets-table"
                rows={rows}
                columns={columns}
                getRowId={getSubBrandId}
                tableLabel={tableLabel}
                emptyMessage={emptyMessage}
                pagination={pagination}
            />
        </div>
    )
}

export default DataTableSubBrands
