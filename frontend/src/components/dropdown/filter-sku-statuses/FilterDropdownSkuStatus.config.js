function getSkuStatusStatusValue(skuStatus) {
    if (skuStatus?.is_active !== undefined && skuStatus?.is_active !== null) {
        return Number(skuStatus.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(skuStatus?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

export const skuStatusFilterConfig = [
    {
        key: "status",
        label: "Status",
        placeholder: "All Status",
        searchPlaceholder: "Search status...",
        emptyMessage: "Status not found.",
        apiParam: "is_active",
        options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
        ],
        getValue: getSkuStatusStatusValue,
    },
]
