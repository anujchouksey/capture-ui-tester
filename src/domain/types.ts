export interface AppSettings {
    llmProvider: 'openai' | 'gemini' | 'custom';
    apiKey: string;
    modelName: string;
    customEndpoint?: string;
    targetLanguage: 'playwright' | 'cucumber-java' | 'java-selenium' | 'cypress' | 'selenium-python' | 'puppeteer';
}

export interface CapturedRequest {
    id: string;
    url: string;
    method: string;
    requestBody?: string;
    responseBody?: string;
    status?: number;
    timestamp: number;
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
    name?: string;
    autoDiscovered?: boolean;
    attributes: Record<string, string>;
    screenshotUrl?: string;
}

export interface GeneratedCode {
    language: string;
    code: string;
}
