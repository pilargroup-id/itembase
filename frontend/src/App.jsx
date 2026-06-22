import { useEffect, useState } from 'react'

import BackgroundMain from './components/template/BackgroundMain.jsx'
import Header from './components/template/Header.jsx'
import Sidebar from './components/template/Sidebar.jsx'
import DataTableParents from './components/table/items/dataTableParents.jsx'
import MyTickets from './pages/my-tickets/MyTickets.jsx'

function getCurrentPath() {
  if (typeof window === 'undefined') {
    return '/dashboard'
  }

  return window.location.pathname === '/' ? '/dashboard' : window.location.pathname
}

const pageDetails = {
  '/dashboard': {
    title: 'Dashboard',
    eyebrow: 'Item Base',
  },
  '/parents': {
    title: 'Parent',
    eyebrow: 'Item Management',
  },
  '/variants': {
    title: 'Variants',
    eyebrow: 'Item Management',
  },
  '/bundles': {
    title: 'Bundles',
    eyebrow: 'Item Management',
  },
  '/pic-categories': {
    title: 'Pic Categories',
    eyebrow: 'Master',
  },
  '/item-types': {
    title: 'Item Types',
    eyebrow: 'Master',
  },
  '/ports': {
    title: 'Ports',
    eyebrow: 'Master',
  },
  '/uoms': {
    title: 'Uoms',
    eyebrow: 'Master',
  },
  '/brands': {
    title: 'Brands',
    eyebrow: 'Master',
  },
  '/pics': {
    title: 'Pics',
    eyebrow: 'Master',
  },
}

function App() {
  const [activePath, setActivePath] = useState(getCurrentPath)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastUpdated, setLastUpdated] = useState(() => new Date())

  useEffect(() => {
    const handleRouteChange = () => {
      setActivePath(getCurrentPath())
    }

    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  const activePage = pageDetails[activePath] ?? pageDetails['/dashboard']
  const isDashboardPage = activePath === '/dashboard'
  const isParentsPage = activePath === '/parents'

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
          title="Item Base"
          showMenuButton
          onMenuToggle={() => setMobileSidebarOpen(true)}
          breadcrumb={[
            { label: 'Item Base', href: '#' },
            { label: activePage.title, href: '#', active: true },
          ]}
          searchProps={{
            value: searchQuery,
            placeholder: isDashboardPage ? 'Cari dashboard...' : 'Cari data...',
            ariaLabel: isDashboardPage ? 'Cari dashboard' : 'Cari data',
            onChange: (event) => {
              setSearchQuery(event.target.value)
            },
          }}
          notificationProps={{
            ariaLabel: 'Open notifications',
            modalTitle: 'Notifications',
          }}
          onRefresh={() => setLastUpdated(new Date())}
        />

        <main
          className={`dashboard-main${isDashboardPage ? ' dashboard-main--mytickets' : ''}${isParentsPage ? ' dashboard-main--parents' : ''}`}
        >
          <div
            className={`dashboard-content${isDashboardPage ? ' dashboard-content--mytickets' : ''}${isParentsPage ? ' dashboard-content--parents' : ''}`}
          >
            {isDashboardPage ? (
              <MyTickets activePage={activePage} searchQuery={searchQuery} />
            ) : isParentsPage ? (
              <section
                className="dashboard-panel users-table-card parents-table-card"
                aria-label={activePage.title}
              >
                <div className="users-table-card__header">
                  <div>
                    <p className="dashboard-panel__eyebrow">{activePage.eyebrow}</p>
                    <h1 className="dashboard-panel__title">{activePage.title}</h1>
                  </div>
                </div>

                <DataTableParents
                  searchQuery={searchQuery}
                  tableLabel={`${activePage.title} table`}
                />
              </section>
            ) : (
              <section className="dashboard-grid" aria-label={activePage.title}>
                <article className="dashboard-panel">
                  <div className="dashboard-panel__header">
                    <p className="dashboard-panel__eyebrow">{activePage.eyebrow}</p>
                    <h1 className="dashboard-panel__title">{activePage.title}</h1>
                  </div>

                  <p className="dashboard-stack__text">
                    Halaman ini belum memiliki konten utama di `App.jsx`.
                  </p>
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
                    <li className="dashboard-list__item">Path aktif: {activePath}</li>
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
    </div>
  )
}

export default App
