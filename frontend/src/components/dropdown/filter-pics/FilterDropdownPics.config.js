function getPicsStatusValue(pics) {
    if (pics?.is_active !== undefined && pics?.is_active !== null) {
        return Number(pics.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(pics?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

export const picsFilterConfig = [
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
        getValue: getPicsStatusValue,
    },
]
