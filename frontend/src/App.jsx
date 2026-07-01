import { useEffect, useState } from 'react'

import BackgroundMain from './components/template/BackgroundMain.jsx'
import Header from './components/template/Header.jsx'
import Sidebar from './components/template/Sidebar.jsx'
import ItemPages from './pages/items/items/ItemPages.jsx'
import ParentsPage from './pages/items/parents/ParentsPage.jsx'
import BundlesPage from './pages/items/bundles/BundlesPage.jsx'
import CategoriesPages from './pages/master/categories/CategoriesPages.jsx'
import BrandsPages from './pages/master/brands/BrandsPages.jsx'
import TypePages from './pages/master/type/TypePages.jsx'
import PortsPage from './pages/master/port/PortPages.jsx'
import UomsPages from './pages/master/uoms/UomsPages.jsx'
import PicsPages from './pages/master/pics/PicsPages.jsx'
import PicUsersPage from './pages/master/pic-users/PicUserPages.jsx'
import SkuStatusesPage from './pages/master/sku-statuses/SkuStatusPages.jsx'
import ActivityLogs from './pages/activity-logs/ActivityLogs.jsx'

import api from './services/api.js'

const AUTH_TOKEN_STORAGE_KEY = 'itembase.auth.token'
const AUTH_USER_STORAGE_KEY = 'itembase.auth.user'
const DEFAULT_PATH = '/parents'

function getCurrentPath() {
  if (typeof window === 'undefined') {
    return DEFAULT_PATH
  }

  return ['/', '/dashboard', '/parent'].includes(window.location.pathname)
    ? DEFAULT_PATH
    : window.location.pathname
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

function getStoredAuthToken() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function storeAuthToken(token) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
      return
    }

    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  } catch {
    // Ignore storage errors so auth state can still render from memory.
  }
}

function getTokenFromUrl() {
  if (typeof window === 'undefined') {
    return null
  }

  const searchParams = new URLSearchParams(window.location.search)
  const tokenFromUrl =
    searchParams.get('token') ||
    searchParams.get('authToken') ||
    searchParams.get('access_token')

  if (!tokenFromUrl) {
    return null
  }

  searchParams.delete('token')
  searchParams.delete('authToken')
  searchParams.delete('access_token')

  const nextQuery = searchParams.toString()
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`

  window.history.replaceState({}, '', nextUrl)

  return tokenFromUrl
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
  '/types': {
    title: 'Types',
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
  '/pic-users': {
    title: 'Pic Users',
    eyebrow: 'Master',
  },
  '/sku-statuses': {
    title: 'SKU Status',
    eyebrow: 'Master',
  },
  '/activity-logs': {
    title: 'Logs',
    eyebrow: 'Setting',
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
  const [, setLastUpdated] = useState(() => new Date())

  useEffect(() => {
    const tokenFromUrl = getTokenFromUrl()
    const storedToken = getStoredAuthToken()
    const resolvedToken = tokenFromUrl || storedToken

    if (tokenFromUrl) {
      storeAuthToken(tokenFromUrl)
    }

    if (resolvedToken) {
      api.setToken(resolvedToken)
    } else {
      api.clearToken()
    }
  }, [])

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

        if (error?.status === 401) {
          api.clearToken()
          storeAuthToken(null)
          storeAuthUser(null)
          setAuthUser(null)
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

  const currentPagePath = pageDetails[activePath] ? activePath : DEFAULT_PATH
  const activePage = pageDetails[currentPagePath]
  const isParentsPage = currentPagePath === '/parents'
  const isItemsPage = currentPagePath === '/items'
  const isBundlesPage = currentPagePath === '/bundles'
  const isCategoriesPage = currentPagePath === '/categories'
  const isBrandsPage = currentPagePath === '/brands'
  const isTypePage = currentPagePath === '/types'
  const isPortsPage = currentPagePath === '/ports'
  const isUomsPage = currentPagePath === '/uoms'
  const isPicsPage = currentPagePath === '/pics'
  const isPicUsersPage = currentPagePath === '/pic-users'
  const isSkuStatusesPage = currentPagePath === '/sku-statuses'
  const isActivityLogsPage = currentPagePath === '/activity-logs'
  const isItemManagementTablePage =
    isParentsPage || isItemsPage || isBundlesPage || isCategoriesPage || isBrandsPage || isTypePage || isPortsPage || isUomsPage
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
        activePath={currentPagePath}
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
            placeholder: isParentsPage ? 'Cari parent...' : 'Cari data...',
            ariaLabel: isParentsPage ? 'Cari parent' : 'Cari data',
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
          className={`dashboard-main${isParentsPage ? ' dashboard-main--mytickets' : ''}${isItemManagementTablePage ? ' dashboard-main--parents' : ''}`}
        >
          <div
            className={`dashboard-content${isParentsPage ? ' dashboard-content--mytickets' : ''}${isItemManagementTablePage ? ' dashboard-content--parents' : ''}`}
          >
            {isParentsPage ? (
              <ParentsPage activePage={activePage} searchQuery={searchQuery} />
            ) : isItemsPage ? (
              <ItemPages activePage={activePage} searchQuery={searchQuery} />
            ) : isBundlesPage ? (
              <BundlesPage activePage={activePage} searchQuery={searchQuery} />
            ) : isCategoriesPage ? (
              <CategoriesPages activePage={activePage} searchQuery={searchQuery} />
            ) : isBrandsPage ? (
              <BrandsPages activePage={activePage} searchQuery={searchQuery} />
            ) : isTypePage ? (
              <TypePages activePage={activePage} searchQuery={searchQuery} />
            ) : isPortsPage ? (
              <PortsPage activePage={activePage} searchQuery={searchQuery} />
            ) : isUomsPage ? (
              <UomsPages activePage={activePage} searchQuery={searchQuery} />
            ) : isPicsPage ? (
              <PicsPages activePage={activePage} searchQuery={searchQuery} />
            ) : isPicUsersPage ? (
              <PicUsersPage activePage={activePage} searchQuery={searchQuery} />
            ) : isSkuStatusesPage ? (
              <SkuStatusesPage activePage={activePage} searchQuery={searchQuery} />
            ) : isActivityLogsPage ? (
              <ActivityLogs activePage={activePage} searchQuery={searchQuery} />
            ) : (
              <ParentsPage activePage={activePage} searchQuery={searchQuery} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
