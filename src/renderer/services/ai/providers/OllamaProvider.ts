import { AIProvider, ProviderConfig } from './AIProvider';

export class OllamaProvider implements AIProvider {
    name = 'ollama';
    private baseUrl: string;
    private modelName: string;

    constructor(config: ProviderConfig) {
        this.baseUrl = config.baseUrl || 'http://localhost:11434';
        this.modelName = config.modelName;
    }

    async generateText(prompt: string, system?: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [
                        { role: 'system', content: system || '' },
                        { role: 'user', content: prompt }
                    ],
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.message.content;
        } catch (error) {
            console.error('Ollama Error:', error);
            throw new Error(`Failed to connect to Ollama at ${this.baseUrl}. Ensure it's running.`);
        }
    }

    async generateCompletion(prompt: string, system?: string): Promise<string> {
        // Reuse generateText for now, maybe with specialized parameters if Ollama supports them easily via fetch
        return this.generateText(prompt, system);
    }
}
