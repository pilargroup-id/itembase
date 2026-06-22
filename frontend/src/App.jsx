import { useEffect, useMemo, useState } from 'react'

import BackgroundMain from './components/template/BackgroundMain.jsx'
import DialogDelete from './components/dialog/DialogDelete.jsx'
import DialogEdit from './components/dialog/DialogEdit.jsx'
import Header from './components/template/Header.jsx'
import Sidebar from './components/template/Sidebar.jsx'
import DataTable, {
  DataTableChips,
  DataTableIdentity,
  DataTableStatus,
} from './components/table/DataTable.jsx'
import DataTableAction from './components/table/DataTableAction.jsx'
import ButtonMain from './components/button/ButtonMain.jsx'
import ButtonRangeDate from './components/button/ButtonRangeDate.jsx'
import BarChartPreview from './components/chart/BarChart.jsx'
import DonutChartPreview from './components/chart/DonutChart.jsx'
import HorizontalBarChartPreview from './components/chart/HorizontalBarChart.jsx'
import LineChartPreview from './components/chart/LineChart.jsx'
import PieChartPreview from './components/chart/PieChart.jsx'
import { Edit03, Trash03, Users01 } from './components/template/TemplateIcons.jsx'
import MyTickets from './pages/my-tickets/MyTickets.jsx'
import TeamPerformence from './pages/reports/team-performence/TeamPerformence.jsx'

function getCurrentPath() {
  if (typeof window === 'undefined') {
    return '/MyTickets'
  }

  return window.location.pathname === '/' ? '/MyTickets' : window.location.pathname
}

const pageDetails = {
  '/MyTickets': {
    title: 'MyTickets',
    eyebrow: 'Legal Operations',
    value: '24',
    detail: 'Tiket aktif yang sedang diproses oleh tim legal.',
  },
  '/tickets': {
    title: 'Tickets',
    eyebrow: 'Ticket Queue',
    value: '12',
    detail: 'Permintaan baru yang menunggu review awal.',
  },
  '/documents': {
    title: 'Documents',
    eyebrow: 'Document Control',
    value: '8',
    detail: 'Dokumen legal yang membutuhkan validasi.',
  },
  '/Table': {
    title: 'Data Table',
    eyebrow: 'Table Template',
    value: '8',
    detail: 'Contoh komponen table dengan pencarian, detail row, action, dan pagination.',
  },
  '/TableActions': {
    title: 'Data Table Actions',
    eyebrow: 'Table Template',
    value: '8',
    detail: 'Contoh komponen table dengan kolom action inline untuk edit dan delete.',
  },
  '/TicketsOverview': {
    title: 'Tickets Overview',
    eyebrow: 'Ticket Analytics',
    value: '24',
    detail: 'Ringkasan status dan performa tiket legal.',
  },
  '/ProjectsOverview': {
    title: 'Projects Overview',
    eyebrow: 'Project Summary',
    value: '7',
    detail: 'Ringkasan proyek dan aktivitas terkait.',
  },
  '/Chart': {
    title: 'Chart',
    eyebrow: 'Visual Analytics',
    value: '5',
    detail: 'Kumpulan chart yang siap dipakai untuk visualisasi data.',
  },
  '/Reports/TeamPerformance': {
    title: 'Team Performance',
    eyebrow: 'Reports',
    value: '4',
    detail: 'Performa bulanan setiap user lengkap dengan progress completed dan pending.',
  },
  '/users': {
    title: 'Users',
    eyebrow: 'Access Control',
    value: '16',
    detail: 'User internal yang memiliki akses ke aplikasi legal dengan berbagai peran dan status.',
  },
  '/settings': {
    title: 'Settings',
    eyebrow: 'Workspace',
    value: '5',
    detail: 'Konfigurasi utama untuk alur kerja legal.',
  },
  '/login': {
    title: 'Login',
    eyebrow: 'Session',
    value: '0',
    detail: 'Sesi pengguna sudah diarahkan keluar dari aplikasi.',
  },
}

const tablePagePaths = ['/Table', '/TableActions', '/users']
const USERS_PAGE_SIZE_OPTIONS = [5, 10, 25, 50]
const DEFAULT_USERS_PAGE_SIZE = USERS_PAGE_SIZE_OPTIONS[0]

const userRows = [
  {
    userId: 'USR-001',
    id: 'alfatih',
    name: 'Al Fatih',
    username: 'alfatih',
    email: 'alfatih@pilargroup.id',
    phone: '+62 812 1000 1201',
    department: 'Information Technology',
    departmentId: 'DPT-IT',
    role: 'Frontend Developer',
    jobLevel: 'Staff',
    status: 'Active',
    statusKey: 'active',
    apps: ['MyTickets', 'Legal Docs', 'Tickets'],
    createdAt: '2026-01-10',
    updatedAt: '2026-04-29',
    lastActive: '2026-04-30 09:10',
  },
  {
    userId: 'USR-002',
    id: 'nabila',
    name: 'Nabila Putri',
    username: 'nabila',
    email: 'nabila@pilargroup.id',
    phone: '+62 812 1000 1202',
    department: 'Legal',
    departmentId: 'DPT-LGL',
    role: 'Legal Officer',
    jobLevel: 'Senior Staff',
    status: 'Active',
    statusKey: 'active',
    apps: ['Legal Docs', 'Tickets'],
    createdAt: '2026-01-18',
    updatedAt: '2026-04-24',
    lastActive: '2026-04-30 08:42',
  },
  {
    userId: 'USR-003',
    id: 'bagas',
    name: 'Bagas Pratama',
    username: 'bagas',
    email: 'bagas@pilargroup.id',
    phone: '+62 812 1000 1203',
    department: 'Finance',
    departmentId: 'DPT-FIN',
    role: 'Finance Reviewer',
    jobLevel: 'Supervisor',
    status: 'Pending',
    statusKey: 'pending',
    apps: ['Dashboard', 'Approval'],
    createdAt: '2026-02-03',
    updatedAt: '2026-04-22',
    lastActive: '2026-04-28 16:20',
  },
  {
    userId: 'USR-004',
    id: 'sarah',
    name: 'Sarah Wijaya',
    username: 'sarah',
    email: 'sarah@pilargroup.id',
    phone: '+62 812 1000 1204',
    department: 'Procurement',
    departmentId: 'DPT-PRC',
    role: 'Procurement Lead',
    jobLevel: 'Manager',
    status: 'Active',
    statusKey: 'active',
    apps: ['Vendor Portal', 'Approval', 'Tickets'],
    createdAt: '2026-02-12',
    updatedAt: '2026-04-25',
    lastActive: '2026-04-29 17:15',
  },
  {
    userId: 'USR-005',
    id: 'reza',
    name: 'Reza Mahendra',
    username: 'reza',
    email: 'reza@pilargroup.id',
    phone: '+62 812 1000 1205',
    department: 'Operations',
    departmentId: 'DPT-OPS',
    role: 'Operations Admin',
    jobLevel: 'Staff',
    status: 'Inactive',
    statusKey: 'inactive',
    apps: ['Dashboard'],
    createdAt: '2026-02-20',
    updatedAt: '2026-03-29',
    lastActive: '2026-03-27 11:05',
  },
  {
    userId: 'USR-006',
    id: 'dinda',
    name: 'Dinda Maharani',
    username: 'dinda',
    email: 'dinda@pilargroup.id',
    phone: '+62 812 1000 1206',
    department: 'Human Capital',
    departmentId: 'DPT-HC',
    role: 'HR Business Partner',
    jobLevel: 'Senior Staff',
    status: 'Active',
    statusKey: 'active',
    apps: ['Dashboard', 'User Access'],
    createdAt: '2026-03-01',
    updatedAt: '2026-04-27',
    lastActive: '2026-04-30 07:58',
  },
  {
    userId: 'USR-007',
    id: 'yusuf',
    name: 'Yusuf Hidayat',
    username: 'yusuf',
    email: 'yusuf@pilargroup.id',
    phone: '+62 812 1000 1207',
    department: 'Sales',
    departmentId: 'DPT-SLS',
    role: 'Sales Manager',
    jobLevel: 'Manager',
    status: 'Pending',
    statusKey: 'pending',
    apps: ['CRM', 'Dashboard'],
    createdAt: '2026-03-12',
    updatedAt: '2026-04-18',
    lastActive: '2026-04-18 13:30',
  },
  {
    userId: 'USR-008',
    id: 'mira',
    name: 'Mira Kartika',
    username: 'mira',
    email: 'mira@pilargroup.id',
    phone: '+62 812 1000 1208',
    department: 'Legal',
    departmentId: 'DPT-LGL',
    role: 'Contract Analyst',
    jobLevel: 'Staff',
    status: 'Active',
    statusKey: 'active',
    apps: ['Legal Docs', 'Tickets', 'Approval'],
    createdAt: '2026-03-22',
    updatedAt: '2026-04-29',
    lastActive: '2026-04-29 15:44',
  },
]

const userTableColumns = [
  {
    key: 'user',
    header: 'User',
    render: (user) => (
      <DataTableIdentity
        title={user.name}
        subtitle={user.username}
        badge={
          <DataTableStatus variant={user.statusKey} inline>
            {user.status}
          </DataTableStatus>
        }
      />
    ),
  },
  {
    key: 'department',
    header: 'Department',
    accessor: 'department',
  },
  {
    key: 'role',
    header: 'Role',
    accessor: 'role',
  },
  {
    key: 'apps',
    header: 'Apps',
    render: (user) => <DataTableChips items={user.apps} />,
  },
]

const chartViews = [
  {
    title: 'Line Chart',
    eyebrow: 'Monthly Trend',
    Component: LineChartPreview,
    wide: true,
  },
  {
    title: 'Bar Chart',
    eyebrow: 'Case Progress',
    Component: BarChartPreview,
  },
  {
    title: 'Horizontal Bar',
    eyebrow: 'Category Split',
    Component: HorizontalBarChartPreview,
  },
  {
    title: 'Donut Chart',
    eyebrow: 'Distribution',
    Component: DonutChartPreview,
  },
  {
    title: 'Pie Chart',
    eyebrow: 'Comparison',
    Component: PieChartPreview,
  },
]

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'end-ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'start-ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', totalPages]
}

function getUserDetailSections(user) {
  return [
    {
      title: 'Account',
      fields: [
        { label: 'user_id', value: user.userId },
        { label: 'username', value: user.username },
        { label: 'email', value: user.email },
        { label: 'phone', value: user.phone },
      ],
    },
    {
      title: 'Organization',
      fields: [
        { label: 'department_id', value: user.departmentId },
        { label: 'department', value: user.department },
        { label: 'role', value: user.role },
        { label: 'job_level', value: user.jobLevel },
      ],
    },
    {
      title: 'Access',
      wide: true,
      fields: [
        { label: 'apps', value: user.apps, kind: 'chips' },
        { label: 'status', value: user.status },
        { label: 'created_at', value: user.createdAt },
        { label: 'updated_at', value: user.updatedAt },
        { label: 'last_active', value: user.lastActive },
      ],
    },
  ]
}

function userMatchesSearch(user, searchQuery) {
  const query = searchQuery.trim().toLowerCase()

  if (!query) {
    return true
  }

  return [
    user.name,
    user.username,
    user.email,
    user.department,
    user.role,
    user.status,
    ...(user.apps ?? []),
  ].some((value) => String(value).toLowerCase().includes(query))
}

function App() {
  const [activePath, setActivePath] = useState(getCurrentPath)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const [tableUsers, setTableUsers] = useState(userRows)
  const [usersPage, setUsersPage] = useState(1)
  const [usersPageSize, setUsersPageSize] = useState(DEFAULT_USERS_PAGE_SIZE)
  const [activeActionDialog, setActiveActionDialog] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  useEffect(() => {
    const handleRouteChange = () => {
      setActivePath(getCurrentPath())
    }

    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  const activePage = pageDetails[activePath] ?? pageDetails['/MyTickets']
  const isUsersPage = activePath === '/users'
  const isTableActionsPage = activePath === '/TableActions'
  const isTablePage = tablePagePaths.includes(activePath)
  const isChartPage = activePath === '/Chart'
  const isTeamPerformancePage = activePath === '/Reports/TeamPerformance'
  const tableEntityLabel = isUsersPage ? 'user' : 'data'
  const selectedUserName = selectedUser?.name ?? 'data ini'

  const openActionDialog = (dialogType, user) => {
    setSelectedUser(user)
    setActiveActionDialog(dialogType)
  }

  const closeActionDialog = () => {
    setActiveActionDialog(null)
    setSelectedUser(null)
  }

  const handleEditConfirm = () => {
    setLastUpdated(new Date())
    closeActionDialog()
  }

  const handleDeleteConfirm = () => {
    if (selectedUser?.userId) {
      setTableUsers((currentUsers) =>
        currentUsers.filter((user) => user.userId !== selectedUser.userId),
      )
    }

    setLastUpdated(new Date())
    closeActionDialog()
  }

  const filteredUsers = useMemo(
    () => tableUsers.filter((user) => userMatchesSearch(user, searchQuery)),
    [searchQuery, tableUsers],
  )
  const activeUsersCount = useMemo(
    () => tableUsers.filter((user) => user.statusKey === 'active').length,
    [tableUsers],
  )
  const uniqueAppsCount = useMemo(
    () => new Set(tableUsers.flatMap((user) => user.apps ?? [])).size,
    [tableUsers],
  )
  const usersTotalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPageSize))
  const usersCurrentPage = Math.min(usersPage, usersTotalPages)
  const paginatedUsers = useMemo(() => {
    const startIndex = (usersCurrentPage - 1) * usersPageSize

    return filteredUsers.slice(startIndex, startIndex + usersPageSize)
  }, [filteredUsers, usersCurrentPage, usersPageSize])
  const usersPagination = useMemo(() => {
    const firstItem = filteredUsers.length === 0 ? 0 : (usersCurrentPage - 1) * usersPageSize + 1
    const lastItem = Math.min(usersCurrentPage * usersPageSize, filteredUsers.length)

    return {
      summary: `${firstItem}-${lastItem} dari ${filteredUsers.length} ${tableEntityLabel}`,
      currentPage: usersCurrentPage,
      totalPages: usersTotalPages,
      items: getPaginationItems(usersCurrentPage, usersTotalPages),
      pageSize: usersPageSize,
      pageSizeOptions: USERS_PAGE_SIZE_OPTIONS,
      pageSizeLabel: 'Tampilkan',
      pageSizeSuffix: 'baris',
      previousLabel: 'Sebelumnya',
      nextLabel: 'Berikutnya',
      ariaLabel: 'Users pagination',
      pageSizeAriaLabel: 'Jumlah baris per halaman',
      onPrevious: () => setUsersPage((currentPage) => Math.max(1, currentPage - 1)),
      onNext: () => setUsersPage((currentPage) => Math.min(usersTotalPages, currentPage + 1)),
      onSelect: (page) => setUsersPage(page),
      onPageSizeChange: (pageSize) => {
        setUsersPageSize(pageSize)
        setUsersPage(1)
      },
    }
  }, [filteredUsers.length, tableEntityLabel, usersCurrentPage, usersPageSize, usersTotalPages])
  const userTableActions = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        icon: Edit03,
        onClick: (user) => openActionDialog('edit', user),
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash03,
        variant: 'danger',
        onClick: (user) => openActionDialog('delete', user),
      },
    ],
    [],
  )

  const overviewCards = useMemo(
    () => {
      if (activePath === '/MyTickets') {
        return []
      }

      if (isTablePage) {
        return [
          {
            ...activePage,
            value: String(tableUsers.length),
          },
          {
            title: 'Active Users',
            eyebrow: 'Status',
            value: String(activeUsersCount),
            detail: 'User yang saat ini aktif dan dapat mengakses aplikasi.',
          },
          {
            title: 'Apps Access',
            eyebrow: 'Access',
            value: String(uniqueAppsCount),
            detail: 'Aplikasi yang sudah dipetakan pada user internal.',
          },
        ]
      }

      return [
        activePage,
        {
          title: 'MyTickets',
          eyebrow: 'Performance',
          value: '92%',
          detail: 'Permintaan yang selesai sebelum batas SLA.',
        },
        {
          title: 'Priority',
          eyebrow: 'Escalation',
          value: '3',
          detail: 'Tiket prioritas tinggi yang perlu ditindaklanjuti.',
        },
      ]
    },
    [activePage, activeUsersCount, isTablePage, tableUsers.length, uniqueAppsCount, activePath],
  )

  const shellClassName = [
    'dashboard-shell',
    sidebarCollapsed ? 'dashboard-shell--sidebar-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClassName}>
      <BackgroundMain />

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        activePath={activePath}
        userName="Al Fatih"
        userRole="Frontend Developer"
        onToggleCollapse={() => setSidebarCollapsed((currentValue) => !currentValue)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <button
        type="button"
        className={`sidebar-overlay${mobileSidebarOpen ? ' active' : ''}`}
        aria-label="Close sidebar"
        onClick={() => setMobileSidebarOpen(false)}
      />

      <div className="dashboard-stage">
        <Header
          title="Ticketing Legal"
          showMenuButton
          onMenuToggle={() => setMobileSidebarOpen(true)}
          breadcrumb={[
            { label: 'Ticketing Legal', href: '#' },
            { label: activePage.title, href: '#', active: true },
          ]}
          searchProps={{
            value: searchQuery,
            placeholder: isTablePage ? 'Cari data table...' : 'Cari tiket...',
            ariaLabel: isTablePage ? 'Cari data table' : 'Cari tiket legal',
            onChange: (event) => {
              setSearchQuery(event.target.value)
              setUsersPage(1)
            },
          }}
          notificationProps={{
            ariaLabel: 'Open notifications',
            modalTitle: 'Notifications',
          }}
          onRefresh={() => setLastUpdated(new Date())}
        />

        <main
          className={`dashboard-main${activePath === '/MyTickets' ? ' dashboard-main--mytickets' : ''}`}
        >
          <div
            className={`dashboard-content${activePath === '/MyTickets' ? ' dashboard-content--mytickets' : ''}`}
          >
            {activePath !== '/MyTickets' && !isTeamPerformancePage && (
              <section className="dashboard-overview" aria-label="Ringkasan dashboard">
                {overviewCards.map((card) => (
                  <article className="dashboard-card" key={card.title}>
                    <div className="dashboard-card__badge-row">
                      <div className="status-badge">
                        <span className="dashboard-card__label">{card.title}</span>
                      </div>
                    </div>
                    <strong className="dashboard-card__value">{card.value}</strong>
                    <p className="dashboard-card__detail">{card.detail}</p>
                  </article>
                ))}
              </section>
            )}

            {activePath === '/MyTickets' ? (
              <MyTickets activePage={activePage} searchQuery={searchQuery} />
            ) : isTeamPerformancePage ? (
              <TeamPerformence />
            ) : isTablePage ? (
              <section className="dashboard-panel users-table-card" aria-label={activePage.title}>
                <div className="users-table-card__header">
                  <div>
                    <p className="dashboard-panel__eyebrow">{activePage.eyebrow}</p>
                    <h1 className="dashboard-panel__title">{activePage.title}</h1>
                    <p className="users-table-card__description">
                      {isUsersPage
                        ? 'Template data table untuk daftar user internal, akses aplikasi, dan detail account.'
                        : isTableActionsPage
                          ? 'Template data table dengan kolom Action berisi tombol icon-only untuk edit dan delete.'
                          : ''}
                    </p>
                  </div>

                  <div className="users-table-card__actions">
                    <ButtonRangeDate />
                    <button
                      type="button"
                      className="users-table-card__action"
                      onClick={() => setLastUpdated(new Date())}
                    >
                      <Users01 size={18} aria-hidden="true" />
                      <span>{isUsersPage ? 'Tambah User' : 'Tambah Data'}</span>
                    </button>
                    <ButtonMain />
                  </div>
                </div>

                {isTableActionsPage ? (
                  <DataTableAction
                    rows={paginatedUsers}
                    columns={userTableColumns}
                    actions={userTableActions}
                    getRowId={(user) => user.userId}
                    tableLabel={`${activePage.title} table`}
                    emptyMessage={
                      searchQuery
                        ? 'Data tidak ditemukan. Coba pakai kata kunci lain.'
                        : 'Belum ada data.'
                    }
                    pagination={usersPagination}
                  />
                ) : (
                  <DataTable
                    rows={paginatedUsers}
                    columns={userTableColumns}
                    getRowId={(user) => user.userId}
                    tableLabel={`${activePage.title} table`}
                    emptyMessage={
                      searchQuery
                        ? 'Data tidak ditemukan. Coba pakai kata kunci lain.'
                        : 'Belum ada data.'
                    }
                    detail={{
                      columnLabel: 'Detail',
                      buttonLabel: 'Detail',
                      eyebrow: 'User detail',
                      title: (user) => user.name,
                      description: (user) => `${user.role} - ${user.department}`,
                      sections: getUserDetailSections,
                    }}
                    actions={userTableActions}
                    pagination={usersPagination}
                  />
                )}
              </section>
            ) : isChartPage ? (
              <section className="chart-page" aria-label="Chart">
                <div className="chart-grid">
                  {chartViews.map(({ title, eyebrow, Component, wide }) => (
                    <article
                      className={`dashboard-panel chart-card${wide ? ' chart-card--wide' : ''}`}
                      key={title}
                    >
                      <div className="chart-card__header">
                        <p className="dashboard-panel__eyebrow">{eyebrow}</p>
                        <h1 className="dashboard-panel__title">{title}</h1>
                      </div>

                      <div className="chart-card__body">
                        <Component />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <section className="dashboard-grid" aria-label="Aktivitas legal">
                <article className="dashboard-panel">
                  <div className="dashboard-panel__header">
                    <p className="dashboard-panel__eyebrow">Current View</p>
                    <h1 className="dashboard-panel__title">{activePage.title}</h1>
                  </div>

                  <div className="dashboard-stack">
                    <div className="dashboard-stack__item">
                      <h2 className="dashboard-stack__title">Review kontrak vendor</h2>
                      <p className="dashboard-stack__text">
                        Draft kontrak sedang masuk tahap pengecekan klausul komersial.
                      </p>
                    </div>
                    <div className="dashboard-stack__item">
                      <h2 className="dashboard-stack__title">Permintaan legal opinion</h2>
                      <p className="dashboard-stack__text">
                        Tim bisnis meminta analisis risiko untuk kerja sama baru.
                      </p>
                    </div>
                    <div className="dashboard-stack__item">
                      <h2 className="dashboard-stack__title">Pembaharuan dokumen</h2>
                      <p className="dashboard-stack__text">
                        Template dokumen internal sedang disesuaikan dengan kebijakan terbaru.
                      </p>
                    </div>
                  </div>
                </article>

                <aside className="dashboard-panel">
                  <div className="dashboard-panel__header">
                    <p className="dashboard-panel__eyebrow">Workspace</p>
                    <h2 className="dashboard-panel__title">Status</h2>
                  </div>

                  <ul className="dashboard-list">
                    <li className="dashboard-list__item">
                      Search: {searchQuery || 'Belum ada kata kunci'}
                    </li>
                    <li className="dashboard-list__item">
                      Path aktif: {activePath}
                    </li>
                    <li className="dashboard-list__item">
                      Update terakhir: {lastUpdated.toLocaleTimeString('id-ID')}
                    </li>
                  </ul>
                </aside>
              </section>
            )}
          </div>
        </main>
      </div>

      <DialogEdit
        isOpen={activeActionDialog === 'edit'}
        eyebrow="Edit Data"
        title={`Edit ${selectedUserName}`}
        user={selectedUser}
        onClose={closeActionDialog}
        onConfirm={handleEditConfirm}
      />

      <DialogDelete
        isOpen={activeActionDialog === 'delete'}
        eyebrow="Delete Data"
        title={`Delete ${selectedUserName}`}
        user={selectedUser}
        onClose={closeActionDialog}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

export default App
