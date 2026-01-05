import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    details?: string;
    duration?: number;
}

class ToastManager {
    private listeners: Set<(toasts: Toast[]) => void> = new Set();
    private toasts: Toast[] = [];
    private nextId = 1;

    subscribe(listener: (toasts: Toast[]) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener([...this.toasts]));
    }

    show(type: ToastType, message: string, details?: string, duration: number = 5000) {
        const id = `toast-${this.nextId++}`;
        const toast: Toast = { id, type, message, details, duration };

        this.toasts.push(toast);
        this.notify();

        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    success(message: string, details?: string) {
        return this.show('success', message, details);
    }

    error(message: string, details?: string) {
        return this.show('error', message, details, 7000); // Longer for errors
    }

    warning(message: string, details?: string) {
        return this.show('warning', message, details);
    }

    info(message: string, details?: string) {
        return this.show('info', message, details);
    }

    dismiss(id: string) {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.notify();
    }

    clear() {
        this.toasts = [];
        this.notify();
    }
}

export const toastManager = new ToastManager();

/**
 * React hook to use toasts in components
 */
export function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const unsubscribe = toastManager.subscribe(setToasts);
        return () => {
            unsubscribe();
        };
    }, []);

    return {
        toasts,
        showToast: (type: ToastType, message: string, details?: string) =>
            toastManager.show(type, message, details),
        success: (message: string, details?: string) => toastManager.success(message, details),
        error: (message: string, details?: string) => toastManager.error(message, details),
        warning: (message: string, details?: string) => toastManager.warning(message, details),
        info: (message: string, details?: string) => toastManager.info(message, details),
        dismiss: (id: string) => toastManager.dismiss(id),
        clear: () => toastManager.clear()
    };
}
