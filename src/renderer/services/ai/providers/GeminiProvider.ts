import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, ProviderConfig } from './AIProvider';

export class GeminiProvider implements AIProvider {
    name = 'gemini';
    private genAI: GoogleGenerativeAI | null = null;
    private modelName: string;

    constructor(config: ProviderConfig) {
        if (config.apiKey) {
            this.genAI = new GoogleGenerativeAI(config.apiKey);
        }
        this.modelName = config.modelName;
    }

    async generateText(prompt: string, system?: string): Promise<string> {
        if (!this.genAI) {
            throw new Error('Gemini API key not set.');
        }

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction: system,
        });

        const result = await model.generateContent(prompt);
        return result.response.text();
    }

    async generateCompletion(prompt: string, system?: string): Promise<string> {
        if (!this.genAI) {
            throw new Error('Gemini API key not set.');
        }

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction: system,
            generationConfig: {
                temperature: 0.1, // Low temperature for deterministic code completion
                maxOutputTokens: 100, // Short completions are better for ghost text
            }
        });

        const result = await model.generateContent(prompt);
        return result.response.text();
    }
}
