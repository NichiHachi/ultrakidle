import { createContext, useContext, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

export type GuessboardColumn = "enemy_name" | "enemy_type" | "weight_class" | "health" | "level_count" | "appearance";

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface UserSettings {
    cellColors: "default" | "colorblind" | "custom";
    showHintIcons: boolean;
    guessboardColumns: GuessboardColumn[];
    allowRandomGuess: {
        classic: boolean;
        cybergrind: boolean;
    };
    confirmDialogs: {
        infernoguessr: boolean;
        classic: boolean;
        cybergrind: boolean;
    };
    customColors: {
        correct: RGB;
        partial: RGB;
        incorrect: RGB;
    };
}

export const DEFAULT_SETTINGS: UserSettings = {
    cellColors: "default",
    showHintIcons: false,
    guessboardColumns: ["enemy_name", "enemy_type", "weight_class", "health", "level_count", "appearance"],
    allowRandomGuess: {
        classic: false,
        cybergrind: false,
    },
    confirmDialogs: {
        infernoguessr: false,
        classic: false,
        cybergrind: false,
    },
    customColors: {
        correct: { r: 0.13, g: 0.77, b: 0.37 }, // green-500 roughly
        partial: { r: 0.92, g: 0.68, b: 0.13 }, // yellow-500 roughly
        incorrect: { r: 0.94, g: 0.27, b: 0.27 }, // red-500 roughly
    }
};

interface SettingsContextType {
    settings: UserSettings;
    updateSettings: (newSettings: Partial<UserSettings>) => void;
    syncWithDbSettings: (dbSettings: any | null) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettingsState] = useState<UserSettings>(() => {
        const saved = localStorage.getItem('ultrakidle_settings');
        if (saved) {
            try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch (e) { }
        }
        // Fallback for old setting
        const oldColorblind = localStorage.getItem('ultrakidle_colorblind_mode') === 'true';
        if (oldColorblind) {
            return {
                ...DEFAULT_SETTINGS,
                cellColors: 'colorblind',
                showHintIcons: true,
            };
        }
        return DEFAULT_SETTINGS;
    });

    const updateDB = async (s: UserSettings) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('user_settings').upsert({
                    user_id: session.user.id,
                    settings: s,
                });
            }
        } catch (e) {
            console.error('Failed to sync settings to DB:', e);
        }
    };

    const updateSettings = (newSettings: Partial<UserSettings>) => {
        setSettingsState(prev => {
            const next = { ...prev, ...newSettings };
            // Ensure no missing keys in objects like confirmDialogs
            if (newSettings.allowRandomGuess) {
                next.allowRandomGuess = { ...prev.allowRandomGuess, ...newSettings.allowRandomGuess };
            }
            if (newSettings.confirmDialogs) {
                next.confirmDialogs = { ...prev.confirmDialogs, ...newSettings.confirmDialogs };
            }
            if (newSettings.customColors) {
                next.customColors = { ...prev.customColors, ...newSettings.customColors };
            }

            localStorage.setItem('ultrakidle_settings', JSON.stringify(next));
            updateDB(next);
            return next;
        });
    };

    // Called when game initializes and brings settings from DB RPCs
    const syncWithDbSettings = (dbSettings: any | null) => {
        const localSaved = localStorage.getItem('ultrakidle_settings');
        const localSettings = localSaved ? JSON.parse(localSaved) : null;

        if (dbSettings) {
            // DB has settings, take DB over local if they differ, or if local doesn't exist
            const merged = {
                ...DEFAULT_SETTINGS,
                ...dbSettings,
                allowRandomGuess: { ...DEFAULT_SETTINGS.allowRandomGuess, ...(dbSettings.allowRandomGuess || {}) },
                confirmDialogs: { ...DEFAULT_SETTINGS.confirmDialogs, ...(dbSettings.confirmDialogs || {}) },
                customColors: { ...DEFAULT_SETTINGS.customColors, ...(dbSettings.customColors || {}) }
            };
            setSettingsState(merged);
            localStorage.setItem('ultrakidle_settings', JSON.stringify(merged));

            // If local was completely missing, maybe sync back up just in case
            if (!localSettings) {
                updateDB(merged);
            }
        } else if (localSettings) {
            // DB has no settings, but local has: upload to DB
            updateDB({ ...DEFAULT_SETTINGS, ...localSettings });
            setSettingsState({ ...DEFAULT_SETTINGS, ...localSettings });
        } else {
            // Neither has settings -> check old fallback then copy default to both
            const oldColorblind = localStorage.getItem('ultrakidle_colorblind_mode') === 'true';
            const base = oldColorblind
                ? { ...DEFAULT_SETTINGS, cellColors: 'colorblind' as const, showHintIcons: true }
                : DEFAULT_SETTINGS;

            updateDB(base);
            setSettingsState(base);
            localStorage.setItem('ultrakidle_settings', JSON.stringify(base));
        }
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSettings,
            syncWithDbSettings
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
