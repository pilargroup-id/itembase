import { useEffect, useState } from 'react'

import BackgroundMain from './components/template/BackgroundMain.jsx'
import Header from './components/template/Header.jsx'
import Sidebar from './components/template/Sidebar.jsx'
import MyTickets from './pages/my-tickets/MyTickets.jsx'
import ItemPages from './pages/items/items/ItemPages.jsx'
import ParentsPage from './pages/items/parents/ParentsPage.jsx'
import BundlesPage from './pages/items/bundles/BundlesPage.jsx'
import api from './services/api.js'

const AUTH_USER_STORAGE_KEY = 'itembase.auth.user'

function getCurrentPath() {
  if (typeof window === 'undefined') {
    return '/dashboard'
  }

  return window.location.pathname === '/' ? '/dashboard' : window.location.pathname
}

function getStoredAuthUser() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY)

    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

function storeAuthUser(user) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (user) {
      window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
      return
    }

    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
  } catch {
    // Ignore storage errors so auth state can still render from memory.
  }
}

function getAuthUserName(user, isLoading) {
  if (user?.name) {
    return user.name
  }

  if (user?.username) {
    return user.username
  }

  return isLoading ? 'Memuat user...' : 'User'
}

function getAuthUserRole(user, isLoading, error) {
  if (user?.job_position) {
    return user.job_position
  }

  if (user?.department) {
    return user.department
  }

  if (user?.username) {
    return `@${user.username}`
  }

  if (isLoading) {
    return 'Mengambil auth...'
  }

  return error ? 'Auth belum terhubung' : 'Dev Auth'
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
  '/items': {
    title: 'Items',
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
  const [authUser, setAuthUser] = useState(getStoredAuthUser)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
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

  useEffect(() => {
    let isCurrent = true

    const loadAuthUser = async () => {
      setIsAuthLoading(true)
      setAuthError(null)

      try {
        const response = await api.auth.me()
        const nextUser = response?.data ?? null

        if (!isCurrent) {
          return
        }

        setAuthUser(nextUser)
        storeAuthUser(nextUser)
      } catch (error) {
        if (!isCurrent) {
          return
        }

        setAuthError(error)
      } finally {
        if (isCurrent) {
          setIsAuthLoading(false)
        }
      }
    }

    loadAuthUser()

    return () => {
      isCurrent = false
    }
  }, [])

  const activePage = pageDetails[activePath] ?? pageDetails['/dashboard']
  const isDashboardPage = activePath === '/dashboard'
  const isParentsPage = activePath === '/parents'
  const isItemsPage = activePath === '/items'
  const isBundlesPage = activePath === '/bundles'
  const isItemManagementTablePage = isParentsPage || isItemsPage || isBundlesPage
  const sidebarUserName = getAuthUserName(authUser, isAuthLoading)
  const sidebarUserRole = getAuthUserRole(authUser, isAuthLoading, authError)

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
        userName={sidebarUserName}
        userRole={sidebarUserRole}
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
          className={`dashboard-main${isDashboardPage ? ' dashboard-main--mytickets' : ''}${isItemManagementTablePage ? ' dashboard-main--parents' : ''}`}
        >
          <div
            className={`dashboard-content${isDashboardPage ? ' dashboard-content--mytickets' : ''}${isItemManagementTablePage ? ' dashboard-content--parents' : ''}`}
          >
            {isDashboardPage ? (
              <MyTickets activePage={activePage} searchQuery={searchQuery} />
            ) : isParentsPage ? (
              <ParentsPage activePage={activePage} searchQuery={searchQuery} />
            ) : isItemsPage ? (
              <ItemPages activePage={activePage} searchQuery={searchQuery} />
            ) : isBundlesPage ? (
              <BundlesPage activePage={activePage} searchQuery={searchQuery} />
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
