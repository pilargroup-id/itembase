function normalizeOptionValue(value) {
    return String(value ?? "").trim()
}

function createLabel(parts, fallback) {
    const label = parts.map(normalizeOptionValue).filter(Boolean).join(" - ")

    return label || normalizeOptionValue(fallback)
}

function createEntityOption(value, labelParts, fallback = value) {
    const normalizedValue = normalizeOptionValue(value)

    if (!normalizedValue) {
        return null
    }

    return {
        value: normalizedValue,
        label: createLabel(labelParts, fallback),
    }
}

function getNestedId(item, key) {
    return item?.[`${key}_id`] ?? item?.[key]?.id ?? ""
}

function getBrandId(item) {
    return item?.brand_id ?? item?.parent?.brand_id ?? item?.parent?.brand?.id ?? ""
}

function getCategoryId(item) {
    return item?.category_id ?? item?.parent?.category_id ?? item?.parent?.category?.id ?? ""
}

function getBusinessUnitId(item) {
    const channelBusinessUnitId = item?.channels
        ?.map((channel) => channel.business_unit_id ?? channel.business_unit?.id)
        .find((value) => normalizeOptionValue(value))

    return channelBusinessUnitId ?? getNestedId(item, "business_unit")
}

function getCreatedByValue(item) {
    return item?.created_by?.id ?? item?.created_by?.username ?? item?.created_by?.name ?? item?.created_by ?? ""
}

export const itemFilterConfig = [
    {
        key: "status",
        apiParam: "is_active",
        label: "Status",
        placeholder: "All Status",
        searchPlaceholder: "Search status...",
        emptyMessage: "Status not found.",
        searchable: false,
        options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
        ],
        getValue: (item) => (Number(item.is_active) === 1 ? "1" : "0"),
    },
    {
        key: "itemKind",
        apiParam: "item_kind",
        label: "Item Kind",
        placeholder: "All Item Kind",
        searchPlaceholder: "Search item kind...",
        emptyMessage: "Item kind not found.",
        searchable: false,
        options: [
            { value: "regular", label: "Regular" },
            { value: "bundle", label: "Bundle" },
        ],
        getValue: (item) => String(item.item_kind ?? "").toLowerCase(),
    },
    {
        key: "parent",
        apiParam: "parent_id",
        label: "Parent",
        placeholder: "All Parent",
        searchPlaceholder: "Search parent...",
        emptyMessage: "Parent not found.",
        getValue: (item) => getNestedId(item, "parent"),
        getOption: (item) =>
            createEntityOption(getNestedId(item, "parent"), [
                item.parent?.parent_code,
                item.parent?.parent_name ?? item.parent?.item_name,
            ]),
    },
    {
        key: "brand",
        apiParam: "brand_id",
        label: "Brand",
        placeholder: "All Brand",
        searchPlaceholder: "Search brand...",
        emptyMessage: "Brand not found.",
        getValue: (item) => getBrandId(item),
        getOption: (item) =>
            createEntityOption(getBrandId(item), [
                item.parent?.brand?.code,
                item.parent?.brand?.name,
            ]),
    },
    {
        key: "skuStatus",
        apiParam: "sku_status_id",
        label: "SKU Status",
        placeholder: "All SKU Status",
        searchPlaceholder: "Search SKU status...",
        emptyMessage: "SKU status not found.",
        searchable: false,
        getValue: (item) => getNestedId(item, "sku_status"),
        getOption: (item) =>
            createEntityOption(getNestedId(item, "sku_status"), [
                item.sku_status?.code,
                item.sku_status?.name,
            ]),
    },
    {
        key: "businessUnit",
        apiParam: "business_unit_id",
        label: "Business Unit",
        placeholder: "All Business Unit",
        searchPlaceholder: "Search business unit...",
        emptyMessage: "Business unit not found.",
        getValue: (item) => getBusinessUnitId(item),
        getOption: (item) =>
            createEntityOption(getBusinessUnitId(item), [
                item.channels?.find((channel) => normalizeOptionValue(channel.business_unit_id ?? channel.business_unit?.id))?.business_unit?.code,
                item.channels?.find((channel) => normalizeOptionValue(channel.business_unit_id ?? channel.business_unit?.id))?.business_unit?.name,
                item.business_unit?.code,
                item.business_unit?.name,
            ]),
    },
    {
        key: "category",
        apiParam: "category_id",
        label: "Category",
        placeholder: "All Category",
        searchPlaceholder: "Search category...",
        emptyMessage: "Category not found.",
        getValue: (item) => getCategoryId(item),
        getOption: (item) =>
            createEntityOption(getCategoryId(item), [
                item.parent?.category?.detail_category,
                item.parent?.category?.sub_category,
                item.parent?.category?.main_category,
            ]),
    },
    {
        key: "createdBy",
        apiParam: "created_by",
        label: "Created By",
        placeholder: "All Created By",
        searchPlaceholder: "Search creator...",
        emptyMessage: "Creator not found.",
        getValue: (item) => getCreatedByValue(item),
        getOption: (item) =>
            createEntityOption(getCreatedByValue(item), [
                item.created_by?.name,
                item.created_by?.username,
                item.created_by,
            ]),
    },
    {
        key: "uom",
        apiParam: "uom_id",
        label: "UOM",
        placeholder: "All UOM",
        searchPlaceholder: "Search UOM...",
        emptyMessage: "UOM not found.",
        getValue: (item) => getNestedId(item, "uom"),
        getOption: (item) =>
            createEntityOption(getNestedId(item, "uom"), [item.uom?.code, item.uom?.name]),
    },
]
