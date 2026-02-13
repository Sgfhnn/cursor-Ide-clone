import { languages, CancellationToken, Position, editor, Range } from 'monaco-editor';
import { aiService } from './aiService';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';

const DEFAULT_KEY = 'AIzaSyCuFCrZG1lGnpCzgUnAwG7nLT5h-yl5zn8';

export const registerGhostText = (monaco: any) => {
    return monaco.languages.registerInlineCompletionsProvider('typescript', {
        provideInlineCompletions: async (model: editor.ITextModel, position: Position, context: languages.InlineCompletionContext, token: CancellationToken) => {
            const { provider, apiKey, isLoading } = useChatStore.getState();
            const { getRemainingRequests, isAuthenticated } = useAuthStore.getState();

            // 1. Basic checks: Authenticated? Not loading?
            if (!isAuthenticated || isLoading) return { items: [] };

            // 2. Determine if we should trigger
            const isExempt = provider === 'ollama' || (!!apiKey && apiKey !== DEFAULT_KEY);
            const remaining = getRemainingRequests();

            // If automatic trigger, ONLY proceed if:
            // - Using local Ollama (free/fast)
            // - OR using custom API key (user pays)
            // - OR explicitly requested (context.triggerKind === 0)
            // We avoid burning free quota on automatic triggers.
            const isManual = context.triggerKind === monaco.languages.InlineCompletionTriggerKind.Invoke;

            if (!isManual && !isExempt) {
                // If not exempt and not manual, return empty to save quota
                return { items: [] };
            }

            // 3. Quota check (if not exempt)
            if (!isExempt && remaining <= 0) return { items: [] };

            // 4. Content check
            const content = model.getValue();
            if (content.trim().length === 0) return { items: [] };

            // Insert cursor marker
            const codeWithCursor = content.substring(0, model.getOffsetAt(position)) + '<CURSOR>' + content.substring(model.getOffsetAt(position));

            try {
                // Determine language based on model (simplified)
                const language = model.getLanguageId();

                const completion = await aiService.completeCode({
                    code: codeWithCursor,
                    language,
                    filePath: 'current' // We don't have path here easily without looking up model URI
                });

                if (!completion) return { items: [] };

                // Increment usage if not exempt (and we actually got a completion)
                if (!isExempt) {
                    useAuthStore.getState().incrementUsage();
                }

                return {
                    items: [{
                        insertText: completion,
                        range: new Range(
                            position.lineNumber,
                            position.column,
                            position.lineNumber,
                            position.column
                        )
                    }]
                };
            } catch (err) {
                console.error('GhostText Error:', err);
                return { items: [] };
            }
        },
        freeInlineCompletions: (completions: languages.InlineCompletions) => { }
    });
};
