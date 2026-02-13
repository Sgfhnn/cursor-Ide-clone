export interface AIProvider {
    name: string;
    generateText(prompt: string, system?: string): Promise<string>;
    generateCompletion(prompt: string, system?: string): Promise<string>;
}

export interface ProviderConfig {
    apiKey?: string;
    modelName: string;
    baseUrl?: string;
}
