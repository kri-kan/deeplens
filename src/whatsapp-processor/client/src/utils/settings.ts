// Settings interface
export interface AppSettings {
    stickyHeader: boolean;
    theme: 'light' | 'dark';
}

// Default settings
export const defaultSettings: AppSettings = {
    stickyHeader: false,
    theme: 'dark',
};

const SETTINGS_KEY = 'deeplens_whatsapp_settings';

/**
 * Load settings from localStorage
 */
export function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...defaultSettings, ...parsed };
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
    return defaultSettings;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

/**
 * Update a specific setting
 */
export function updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
): AppSettings {
    const current = loadSettings();
    const updated = { ...current, [key]: value };
    saveSettings(updated);
    return updated;
}
