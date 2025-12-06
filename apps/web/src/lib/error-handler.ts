// Centralized Error Handling System

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  WHATSAPP = 'WHATSAPP',
  PAYMENT = 'PAYMENT',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType
  message: string
  userMessage: string
  details?: any
  timestamp: Date
  stack?: string
}

class ErrorHandler {
  private errors: AppError[] = []
  private maxErrors = 100

  log(error: AppError) {
    this.errors.unshift(error)
    if (this.errors.length > this.maxErrors) {
      this.errors.pop()
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[AppError]', error)
    }

    // TODO: Send to error tracking service (Sentry, etc.)
    this.sendToErrorTracking(error)
  }

  private async sendToErrorTracking(error: AppError) {
    try {
      // Send to backend logging endpoint
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error),
      })
    } catch (e) {
      // Silently fail - don't want logging errors to break the app
      console.error('Failed to send error to tracking:', e)
    }
  }

  getRecentErrors(limit = 10): AppError[] {
    return this.errors.slice(0, limit)
  }

  clearErrors() {
    this.errors = []
  }

  handleError(error: any, type: ErrorType = ErrorType.UNKNOWN): AppError {
    const appError: AppError = {
      type,
      message: error.message || 'An error occurred',
      userMessage: this.getUserFriendlyMessage(type, error),
      details: error,
      timestamp: new Date(),
      stack: error.stack,
    }

    this.log(appError)
    return appError
  }

  private getUserFriendlyMessage(type: ErrorType, error: any): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Koneksi internet bermasalah. Silakan cek koneksi Anda.'
      case ErrorType.AUTH:
        return 'Sesi Anda telah berakhir. Silakan login kembali.'
      case ErrorType.VALIDATION:
        return error.message || 'Data yang Anda masukkan tidak valid.'
      case ErrorType.SERVER:
        return 'Terjadi kesalahan di server. Tim kami sedang menanganinya.'
      case ErrorType.WHATSAPP:
        return 'WhatsApp tidak terhubung. Silakan setup ulang koneksi.'
      case ErrorType.PAYMENT:
        return 'Pembayaran gagal diproses. Silakan coba lagi.'
      case ErrorType.DATABASE:
        return 'Gagal menyimpan data. Silakan coba lagi.'
      default:
        return 'Terjadi kesalahan. Silakan coba lagi atau hubungi support.'
    }
  }
}

export const errorHandler = new ErrorHandler()

// Helper functions for common error scenarios
export function handleNetworkError(error: any): AppError {
  return errorHandler.handleError(error, ErrorType.NETWORK)
}

export function handleAuthError(error: any): AppError {
  return errorHandler.handleError(error, ErrorType.AUTH)
}

export function handleValidationError(error: any): AppError {
  return errorHandler.handleError(error, ErrorType.VALIDATION)
}

export function handleServerError(error: any): AppError {
  return errorHandler.handleError(error, ErrorType.SERVER)
}

export function handleWhatsAppError(error: any): AppError {
  return errorHandler.handleError(error, ErrorType.WHATSAPP)
}

export function handlePaymentError(error: any): AppError {
  return errorHandler.handleError(error, ErrorType.PAYMENT)
}

export function handleDatabaseError(error: any): AppError {
  return errorHandler.handleError(error, ErrorType.DATABASE)
}
