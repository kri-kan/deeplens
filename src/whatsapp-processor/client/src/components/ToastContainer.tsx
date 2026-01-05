import { makeStyles, tokens, Button } from '@fluentui/react-components';
import {
    Dismiss24Regular,
    CheckmarkCircle24Filled,
    ErrorCircle24Filled,
    Warning24Filled,
    Info24Filled
} from '@fluentui/react-icons';
import { useToasts, Toast, ToastType } from '../utils/toast';

const useStyles = makeStyles({
    container: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px',
    },
    toast: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: tokens.shadow16,
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        animation: 'slideIn 0.3s ease-out',
    },
    toastSuccess: {
        borderLeftWidth: '4px',
        borderLeftColor: tokens.colorPaletteGreenBorder1,
    },
    toastError: {
        borderLeftWidth: '4px',
        borderLeftColor: tokens.colorPaletteRedBorder1,
    },
    toastWarning: {
        borderLeftWidth: '4px',
        borderLeftColor: tokens.colorPaletteYellowBorder1,
    },
    toastInfo: {
        borderLeftWidth: '4px',
        borderLeftColor: tokens.colorBrandForeground1,
    },
    iconSuccess: {
        color: tokens.colorPaletteGreenForeground1,
    },
    iconError: {
        color: tokens.colorPaletteRedForeground1,
    },
    iconWarning: {
        color: tokens.colorPaletteYellowForeground1,
    },
    iconInfo: {
        color: tokens.colorBrandForeground1,
    },
    content: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    message: {
        fontWeight: 600,
        fontSize: '14px',
        color: tokens.colorNeutralForeground1,
    },
    details: {
        fontSize: '12px',
        color: tokens.colorNeutralForeground3,
        wordBreak: 'break-word',
    },
    closeButton: {
        minWidth: 'auto',
        padding: '4px',
    },
});

const iconMap: Record<ToastType, any> = {
    success: CheckmarkCircle24Filled,
    error: ErrorCircle24Filled,
    warning: Warning24Filled,
    info: Info24Filled,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const styles = useStyles();
    const Icon = iconMap[toast.type];

    const getIconClass = () => {
        switch (toast.type) {
            case 'success': return styles.iconSuccess;
            case 'error': return styles.iconError;
            case 'warning': return styles.iconWarning;
            case 'info': return styles.iconInfo;
        }
    };

    const getToastClass = () => {
        switch (toast.type) {
            case 'success': return styles.toastSuccess;
            case 'error': return styles.toastError;
            case 'warning': return styles.toastWarning;
            case 'info': return styles.toastInfo;
        }
    };

    return (
        <div className={`${styles.toast} ${getToastClass()}`}>
            <Icon className={getIconClass()} />
            <div className={styles.content}>
                <div className={styles.message}>{toast.message}</div>
                {toast.details && <div className={styles.details}>{toast.details}</div>}
            </div>
            <Button
                appearance="subtle"
                icon={<Dismiss24Regular />}
                onClick={() => onDismiss(toast.id)}
                className={styles.closeButton}
                title="Dismiss"
            />
        </div>
    );
}

export default function ToastContainer() {
    const styles = useStyles();
    const { toasts, dismiss } = useToasts();

    if (toasts.length === 0) return null;

    return (
        <>
            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
            <div className={styles.container}>
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </>
    );
}
