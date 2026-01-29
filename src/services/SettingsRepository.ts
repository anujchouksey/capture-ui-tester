import { AppSettings } from '../domain/types';

const STORAGE_KEY = 'capture_ui_settings';

export const SettingsRepository = {
    async save(settings: AppSettings): Promise<void> {
        await chrome.storage.local.set({ [STORAGE_KEY]: settings });
    },

    async load(): Promise<AppSettings> {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        return result[STORAGE_KEY] || {
            llmProvider: 'openai',
            apiKey: '',
            modelName: 'gpt-4o',
            targetLanguage: 'playwright'
        };
    }
};
