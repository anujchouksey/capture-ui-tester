import React, { useEffect, useState } from 'react';
import { AppSettings } from '../../domain/types';
import { SettingsRepository } from '../../services/SettingsRepository';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';

interface SettingsFormProps {
    onSave: () => void;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ onSave }) => {
    const [settings, setSettings] = useState<AppSettings>({
        llmProvider: 'openai',
        apiKey: '',
        modelName: 'gpt-4o',
        targetLanguage: 'playwright'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        SettingsRepository.load().then(s => {
            setSettings(s);
            setLoading(false);
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await SettingsRepository.save(settings);
        onSave();
    };

    if (loading) return <div>Loading settings...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow-sm border border-slate-100">
            <h3 className="font-semibold text-lg pb-2 border-b border-slate-100">Configuration</h3>

            <Select
                label="LLM Provider"
                name="llmProvider"
                value={settings.llmProvider}
                onChange={handleChange}
                options={[
                    { label: 'OpenAI', value: 'openai' },
                    { label: 'Gemini (Coming Soon)', value: 'gemini' },
                ]}
            />

            <Input
                label="API Key"
                name="apiKey"
                type="password"
                value={settings.apiKey}
                onChange={handleChange}
                placeholder="sk-..."
            />

            <Input
                label="Model Name"
                name="modelName"
                value={settings.modelName}
                onChange={handleChange}
                placeholder="gpt-4o"
            />

            <Select
                label="Target Language"
                name="targetLanguage"
                value={settings.targetLanguage}
                onChange={handleChange}
                options={[
                    { label: 'Playwright (TS)', value: 'playwright' },
                    { label: 'Cucumber (Java)', value: 'cucumber-java' },
                    { label: 'Selenium (Java)', value: 'java-selenium' },
                    { label: 'Cypress (TS)', value: 'cypress' },
                    { label: 'Selenium (Python)', value: 'selenium-python' },
                    { label: 'Puppeteer (TS)', value: 'puppeteer' },
                ]}
            />

            <div className="pt-4 flex justify-end">
                <Button type="submit">Save Settings</Button>
            </div>
        </form>
    );
};
