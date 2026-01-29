import { AppSettings, CapturedElement, GeneratedCode, CapturedRequest } from '../domain/types';

export interface LLMProvider {
    generateCode(elements: CapturedElement[], settings: AppSettings, requests?: CapturedRequest[]): Promise<GeneratedCode>;
}

export class OpenAILLMProvider implements LLMProvider {
    async generateCode(elements: CapturedElement[], settings: AppSettings, requests: CapturedRequest[] = []): Promise<GeneratedCode> {
        if (!settings.apiKey) throw new Error("API Key is missing");

        const prompt = this.buildPrompt(elements, requests, settings.targetLanguage);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [
                    { role: 'system', content: 'You are an expert QA Automation Engineer. Generate robust, production-ready code. Use Page Object Model where appropriate.' },
                    { role: 'user', content: prompt }
                ]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return {
            language: settings.targetLanguage,
            code: data.choices[0].message.content
        };
    }

    private buildPrompt(elements: CapturedElement[], requests: CapturedRequest[], language: string): string {
        return `
      Generate ${language} code.
      
      UI Elements Captured:
      ${JSON.stringify(elements.map(e => ({ tag: e.tagName, attributes: e.attributes, outerHTML: e.outerHTML })), null, 2)}
      
      Network Requests Captured:
      ${JSON.stringify(requests.map(r => ({ method: r.method, url: r.url, status: r.status, body: r.requestBody })), null, 2)}
      
      Instructions:
      1. If UI elements are present, generate page objects/selectors/steps to interact with them.
      2. If Network requests are present, include code to intercept/mock these requests or verify them (e.g., page.route in Playwright, or cy.intercept in Cypress).
      3. Use best practices for the target language (${language}).
      4. Return ONLY the code block.
    `;
    }
}

export const LLMServiceFactory = {
    getProvider(settings: AppSettings): LLMProvider {
        switch (settings.llmProvider) {
            case 'openai':
                return new OpenAILLMProvider();
            default:
                return new OpenAILLMProvider();
        }
    }
};
