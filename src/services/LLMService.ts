import { AppSettings, CapturedElement, GeneratedCode } from '../domain/types';

export interface LLMProvider {
    generateCode(elements: CapturedElement[], settings: AppSettings): Promise<GeneratedCode>;
}

export class OpenAILLMProvider implements LLMProvider {
    async generateCode(elements: CapturedElement[], settings: AppSettings): Promise<GeneratedCode> {
        if (!settings.apiKey) throw new Error("API Key is missing");

        const prompt = this.buildPrompt(elements, settings.targetLanguage);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [
                    { role: 'system', content: 'You are an expert QA Automation Engineer. Generate robust, production-ready code.' },
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

    private buildPrompt(elements: CapturedElement[], language: string): string {
        return `
      Generate ${language} code for the following UI elements.
      For each element, create a page object model selector or a step definition.
      
      Elements:
      ${JSON.stringify(elements.map(e => ({ tag: e.tagName, attributes: e.attributes, outerHTML: e.outerHTML })), null, 2)}
      
      Return ONLY the code block without markdown fencing if possible, or minimally formatted.
    `;
    }
}

export const LLMServiceFactory = {
    getProvider(settings: AppSettings): LLMProvider {
        switch (settings.llmProvider) {
            case 'openai':
                return new OpenAILLMProvider();
            case 'gemini':
                // Placeholder for Gemini implementation
                throw new Error("Gemini provider not yet implemented");
            default:
                return new OpenAILLMProvider();
        }
    }
};
