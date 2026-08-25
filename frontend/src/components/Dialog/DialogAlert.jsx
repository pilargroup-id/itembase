import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'

const DEFAULT_TITLES = {
  error: 'An Error Occurred',
  warning: 'Warning',
  success: 'Success',
  info: 'Information',
}

function DialogAlert({
  open = false,
  onClose,
  title,
  message,
  severity = 'info',
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1.5 }}>
        {title || DEFAULT_TITLES[severity] || DEFAULT_TITLES.info}
      </DialogTitle>

      <DialogContent sx={{ pt: '8px !important' }}>
        <Alert severity={severity} variant="outlined">
          <Typography variant="body2">
            {message}
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogAlert
