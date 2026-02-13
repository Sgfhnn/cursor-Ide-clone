import { AIAction } from '../../types';
import prompts from '../../config/prompts.json';
import { AIProvider } from './providers/AIProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';

interface AIContext {
    filePath?: string;
    language?: string;
    code?: string;
    selection?: string;
    instruction?: string;
    error?: string;
    prompt?: string;
    message?: string;
    fileTree?: string;
    additionalFiles?: { path: string, content: string }[];
}

class AIService {
    private provider: AIProvider | null = null;
    private providerType: 'gemini' | 'ollama' | 'openai' = 'gemini';
    private modelName: string = 'gemini-2.5-flash';
    private apiKey: string = '';
    private openAIKey: string = '';
    private firecrawlKey: string = '';
    private ollamaUrl: string = 'http://localhost:11434';
    private usageMode: 'trial' | 'custom' = 'trial';
    private readonly DEFAULT_GEMINI_KEY = ''; // REMOVED: User must provide their own key

    setUsageMode(mode: 'trial' | 'custom') {
        this.usageMode = mode;
        this.refreshProvider();
    }

    setApiKey(key: string) {
        this.apiKey = key;
        this.refreshProvider();
    }

    setOpenAIKey(key: string) {
        this.openAIKey = key;
        this.refreshProvider();
    }

    setFirecrawlKey(key: string) {
        this.firecrawlKey = key;
    }

    setProvider(provider: 'gemini' | 'ollama' | 'openai') {
        this.providerType = provider;
        this.refreshProvider();
    }

    setModel(model: string) {
        this.modelName = model;
        this.refreshProvider();
    }

    private refreshProvider() {
        if (this.providerType === 'gemini') {
            const key = this.usageMode === 'trial' ? this.DEFAULT_GEMINI_KEY : (this.apiKey || this.DEFAULT_GEMINI_KEY);
            this.provider = new GeminiProvider({
                apiKey: key,
                modelName: this.modelName
            });
        } else if (this.providerType === 'openai') {
            // OpenAI doesn't have a shared trial key currently, 
            // but we allow trial mode to use Gemini even if OpenAI is selected?
            // Or we just use the key if available.
            this.provider = new OpenAIProvider({
                apiKey: this.openAIKey,
                modelName: this.modelName
            });
        } else {
            this.provider = new OllamaProvider({
                modelName: this.modelName,
                baseUrl: this.ollamaUrl
            });
        }
    }

    async scrapeUrl(url: string): Promise<string> {
        if (!this.firecrawlKey) {
            throw new Error('Firecrawl API key not set. Please configure it in Settings.');
        }

        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.firecrawlKey}`
            },
            body: JSON.stringify({ url, formats: ['markdown'] })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Firecrawl Error: ${err.error?.message || response.statusText}`);
        }

        const res = await response.json();
        return res.data?.markdown || 'No content found';
    }

    private getPromptConfig(action: AIAction | 'chat') {
        const keyMap: Record<string, string> = {
            explain: 'explainCode',
            refactor: 'refactorCode',
            generate: 'generateFile',
            fix: 'fixBug',
            chat: 'chat'
        };
        const configKey = keyMap[action as string] || (action as string);
        return (prompts as any)[configKey];
    }

    private buildPrompt(template: string, context: AIContext): string {
        let result = template;
        Object.entries(context).forEach(([key, value]) => {
            if (typeof value === 'string') {
                result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
            }
        });

        result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_, key, content) => {
            return context[key as keyof AIContext] ? content : '';
        });

        return result.trim();
    }

    async chat(message: string, context: AIContext): Promise<string> {
        const config = this.getPromptConfig('chat');
        const userPrompt = this.buildPrompt(config.userTemplate, { ...context, message });
        if (!this.provider) this.refreshProvider();
        return this.provider!.generateText(userPrompt, config.system);
    }

    async explainCode(context: AIContext): Promise<string> {
        const config = this.getPromptConfig('explain' as any);
        const userPrompt = this.buildPrompt(config.userTemplate, context);
        if (!this.provider) this.refreshProvider();
        return this.provider!.generateText(userPrompt, config.system);
    }

    async refactorCode(context: AIContext): Promise<string> {
        const config = this.getPromptConfig('refactor' as any);
        const userPrompt = this.buildPrompt(config.userTemplate, context);
        if (!this.provider) this.refreshProvider();
        const response = await this.provider!.generateText(userPrompt, config.system);
        return this.extractCode(response);
    }

    async generateFile(context: AIContext): Promise<string> {
        const config = this.getPromptConfig('generate' as any);
        const userPrompt = this.buildPrompt(config.userTemplate, context);
        if (!this.provider) this.refreshProvider();
        const response = await this.provider!.generateText(userPrompt, config.system);
        return this.extractCode(response);
    }

    async fixBug(context: AIContext): Promise<string> {
        const config = this.getPromptConfig('fix' as any);
        const userPrompt = this.buildPrompt(config.userTemplate, context);
        if (!this.provider) this.refreshProvider();
        const response = await this.provider!.generateText(userPrompt, config.system);
        return this.extractCode(response);
    }

    async completeCode(context: AIContext): Promise<string> {
        const systemPrompt = "You are an AI coding assistant. Provide a single code completion for the current cursor position. Do not explain. Do not use markdown blocks. Return only the code to insert.";
        const userPrompt = `Complete the following code at the cursor (marked as <CURSOR>). \n\nFile: ${context.filePath}\nLanguage: ${context.language}\n\nCode:\n${context.code}`;

        if (!this.provider) this.refreshProvider();
        const response = await this.provider!.generateCompletion(userPrompt, systemPrompt);
        return this.extractCode(response);
    }

    private extractCode(response: string): string {
        const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/;
        const match = response.match(codeBlockRegex);
        return match ? match[1].trim() : response.trim();
    }

    parseAgenticFiles(response: string): any[] | null {
        const regex = /```file_operations\n([\s\S]*?)```/;
        const match = response.match(regex);
        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch (e) {
                console.error('Failed to parse agentic files:', e);
                return null;
            }
        }
        return null;
    }
}

export const aiService = new AIService();
export default aiService;
