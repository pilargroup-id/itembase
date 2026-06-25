function getPicUserStatusValue(picUser) {
    if (picUser?.is_active !== undefined && picUser?.is_active !== null) {
        return Number(picUser.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(picUser?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

export const picUserFilterConfig = [
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
        getValue: getPicUserStatusValue,
    },
]
