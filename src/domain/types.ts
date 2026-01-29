export interface AppSettings {
    llmProvider: 'openai' | 'gemini' | 'custom';
    apiKey: string;
    modelName: string;
    customEndpoint?: string;
    targetLanguage: 'playwright' | 'cucumber-java' | 'java-selenium';
}

export interface CapturedElement {
    id: string;
    tagName: string;
    selectors: {
        css: string;
        xpath: string;
        testId?: string;
    };
    outerHTML: string;
    attributes: Record<string, string>;
    screenshotUrl?: string;
}

export interface GeneratedCode {
    language: string;
    code: string;
}
