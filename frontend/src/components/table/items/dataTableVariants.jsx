import { useEffect, useMemo, useState } from "react"
import DataTable, {
    DataTableIdentity,
    DataTableStatus,
} from "../DataTable.jsx"

import {
    DEFAULT_PAGE_SIZE,
    EMPTY_DATE_RANGE,
    INITIAL_TICKET_ROWS,
    PAGE_SIZE_OPTIONS,
    getFilteredTicketRows,
    getPaginationItems,
    getStatusVariant,
} from "../../../services/items/DataTableitems.js"

const columns = [
    {
        // key 'category',
        // header: 'Category',
        // accessor: 'category',
        // cellStyle: { whiteSpace: 'nowrap', width: '10%' },
    }
]