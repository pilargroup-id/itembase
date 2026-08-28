import { useEffect } from 'react'
import { Alert, Fade } from '@mui/material'

const AUTO_HIDE_DURATION = 3200

function AlertActionItem({ id, message, severity = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), AUTO_HIDE_DURATION)

    return () => clearTimeout(timer)
  }, [id, onClose])

  return (
    <Fade in appear>
      <Alert
        onClose={() => onClose(id)}
        severity={severity}
        variant="filled"
        sx={{
          minWidth: 260,
          maxWidth: 340,
          alignItems: 'center',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          fontSize: '0.8125rem',
          py: 0.5,
          pointerEvents: 'auto',
        }}
      >
        {message}
      </Alert>
    </Fade>
  )
}

function AlertAction({ alerts = [], onClose }) {
  if (alerts.length === 0) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {alerts.map((alert) => (
        <AlertActionItem key={alert.id} {...alert} onClose={onClose} />
      ))}
    </div>
  )
}

export default AlertAction
