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

export const uomFilterConfig = [
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
        getValue: getUomStatusValue,
    },
]
