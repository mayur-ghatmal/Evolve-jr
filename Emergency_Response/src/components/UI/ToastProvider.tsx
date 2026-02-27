import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    type: ToastType
    message: string
}

interface ToastContextType {
    showToast: (msg: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => { } })
export const useToast = () => useContext(ToastContext)

const ICONS = {
    success: <CheckCircle size={18} color="var(--green)" />,
    error: <XCircle size={18} color="var(--red)" />,
    warning: <AlertTriangle size={18} color="var(--priority-high)" />,
    info: <Info size={18} color="#64b5f6" />,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).slice(2)
        setToasts(prev => [...prev, { id, type, message }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }, [])

    const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        {ICONS[t.type]}
                        <span style={{ flex: 1, fontSize: '0.875rem' }}>{t.message}</span>
                        <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
