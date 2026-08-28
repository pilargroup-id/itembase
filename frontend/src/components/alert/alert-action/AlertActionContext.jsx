import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

import AlertAction from './AlertAction.jsx'

const AlertActionContext = createContext(null)

export function AlertActionProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const idRef = useRef(0)

  const closeAlert = useCallback((id) => {
    setAlerts((currentAlerts) => currentAlerts.filter((alert) => alert.id !== id))
  }, [])

  const notify = useCallback((message, severity = 'success') => {
    if (!message) {
      return
    }

    idRef.current += 1
    const id = idRef.current

    setAlerts((currentAlerts) => [...currentAlerts, { id, message, severity }])
  }, [])

  const notifySuccess = useCallback((message) => notify(message, 'success'), [notify])
  const notifyError = useCallback((message) => notify(message, 'error'), [notify])
  const notifyWarning = useCallback((message) => notify(message, 'warning'), [notify])
  const notifyInfo = useCallback((message) => notify(message, 'info'), [notify])

  const value = useMemo(
    () => ({ notify, notifySuccess, notifyError, notifyWarning, notifyInfo }),
    [notify, notifySuccess, notifyError, notifyWarning, notifyInfo],
  )

  return (
    <AlertActionContext.Provider value={value}>
      {children}
      <AlertAction alerts={alerts} onClose={closeAlert} />
    </AlertActionContext.Provider>
  )
}

export function useAlertAction() {
  const context = useContext(AlertActionContext)

  if (!context) {
    throw new Error('useAlertAction must be used within an AlertActionProvider')
  }

  return context
}
