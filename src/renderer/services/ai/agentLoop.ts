import { aiService } from './aiService';

export interface ToolCall {
    tool: 'terminal' | 'readFile' | 'writeFile' | 'createFile' | 'openPreview';
    command?: string;
    path?: string;
    content?: string;
    url?: string;
}

export interface AgentStep {
    id: string;
    type: 'thinking' | 'tool_call' | 'tool_result' | 'final';
    tool?: string;
    input?: string;
    output?: string;
    status: 'running' | 'done' | 'error';
    timestamp: number;
}

interface AgentLoopOptions {
    message: string;
    context: any;
    rootPath: string;
    maxIterations?: number;
    onStep?: (step: AgentStep) => void;
    abortSignal?: AbortSignal;
}

const AGENT_SYSTEM_PROMPT = `You are an autonomous AI coding assistant. You are currently working in the project root: {{rootPath}}.

CRITICAL RULES:
1. When a user asks you to perform an action (install, create, run, fix, etc.), ALWAYS use a tool call.
2. DO NOT ask the user to run commands themselves. You have the power to do it.
3. Use the following JSON format for tool calls:

\`\`\`tool_call
{"tool": "terminal", "command": "npm install lodash"}
\`\`\`

AVAILABLE TOOLS:
- terminal: Run shell commands.
- readFile: Read file content (relative path).
- writeFile: Overwrite or create file (with content).
- createFile: Create new file and parent directories.
- openPreview: Trigger the live preview panel for the user.

Workflow: Explain your plan -> Tool call block -> Wait for result -> Repeat until task complete.`;

/**
 * Parse tool_call blocks from AI response
 */
export function parseToolCalls(response: string): ToolCall | null {
    const toolCallRegex = /```tool_call\s*\n([\s\S]*?)\n```/;
    const match = response.match(toolCallRegex);

    if (!match) return null;

    try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.tool && ['terminal', 'readFile', 'writeFile', 'createFile'].includes(parsed.tool)) {
            return parsed as ToolCall;
        }
    } catch (e) {
        console.error('Failed to parse tool call:', e);
    }
    return null;
}

/**
 * Execute a tool call and return the result
 */
async function executeToolCall(toolCall: ToolCall, rootPath: string): Promise<string> {
    const api = window.electronAPI;

    switch (toolCall.tool) {
        case 'terminal': {
            if (!toolCall.command) return 'Error: No command provided';
            try {
                const result = await api.executeCommand(toolCall.command, rootPath);
                const output = result.stdout || '';
                const error = result.stderr || '';
                if (error && !output) {
                    return `STDERR:\n${error}`;
                }
                return output + (error ? `\n\nSTDERR:\n${error}` : '');
            } catch (e) {
                return `Error executing command: ${e}`;
            }
        }

        case 'readFile': {
            if (!toolCall.path) return 'Error: No path provided';
            const fullPath = toolCall.path.match(/^[a-zA-Z]:/) ? toolCall.path : `${rootPath}/${toolCall.path}`;
            try {
                const content = await api.readFile(fullPath);
                return content || 'File is empty or could not be read';
            } catch (e) {
                return `Error reading file: ${e}`;
            }
        }

        case 'writeFile':
        case 'createFile': {
            if (!toolCall.path || toolCall.content === undefined) return 'Error: Path and content required';
            const fullPath = toolCall.path.match(/^[a-zA-Z]:/) ? toolCall.path : `${rootPath}/${toolCall.path}`;
            try {
                const success = await api.writeFile(fullPath, toolCall.content);
                return success ? `Successfully wrote to ${toolCall.path}` : `Failed to write to ${toolCall.path}`;
            } catch (e) {
                return `Error writing file: ${e}`;
            }
        }

        case 'openPreview': {
            const url = toolCall.url || 'http://localhost:3000';
            // We need to trigger this via a DOM event or a specialized IPC
            window.dispatchEvent(new CustomEvent('open-preview', { detail: { url } }));
            return `Opening preview for ${url}...`;
        }

        default:
            return `Unknown tool: ${toolCall.tool}`;
    }
}

/**
 * Run the autonomous agent loop
 * The AI gets to make tool calls, see results, and iterate until done
 */
export async function runAgentLoop(options: AgentLoopOptions): Promise<{
    finalResponse: string;
    steps: AgentStep[];
}> {
    const { message, context, rootPath, maxIterations = 5, onStep, abortSignal } = options;
    const steps: AgentStep[] = [];
    const conversationHistory: { role: string; content: string }[] = [];

    // Initial user message (enhanced with context)
    conversationHistory.push({ role: 'user', content: message });

    let iteration = 0;
    let finalResponse = '';

    while (iteration < maxIterations) {
        if (abortSignal?.aborted) {
            finalResponse = '⚠️ Agent loop was stopped by user.';
            break;
        }

        iteration++;

        // Step: Thinking
        const thinkingStep: AgentStep = {
            id: `step-${Date.now()}-think`,
            type: 'thinking',
            status: 'running',
            timestamp: Date.now(),
        };
        steps.push(thinkingStep);
        onStep?.(thinkingStep);

        // Build the full prompt with conversation history
        const historyStr = conversationHistory
            .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
            .join('\n\n');

        const fullPrompt = `${historyStr}\n\n${context.fileTree ? `\n=== PROJECT STRUCTURE ===\n${context.fileTree}` : ''}${context.code ? `\n=== CURRENT FILE (${context.filePath}) ===\n\`\`\`\n${context.code}\n\`\`\`` : ''}`;

        // Get AI response
        let aiResponse: string;
        try {
            // Use the agent system prompt for autonomous mode
            if (!aiService['provider']) {
                aiService['refreshProvider']();
            }
            const systemPrompt = AGENT_SYSTEM_PROMPT.replace('{{rootPath}}', rootPath);
            aiResponse = await aiService['provider']!.generateText(fullPrompt, systemPrompt);
        } catch (e) {
            finalResponse = `Error from AI: ${e instanceof Error ? e.message : e}`;
            thinkingStep.status = 'error';
            onStep?.(thinkingStep);
            break;
        }

        thinkingStep.status = 'done';
        onStep?.(thinkingStep);

        // Check for tool calls in the response
        const toolCall = parseToolCalls(aiResponse);

        if (!toolCall) {
            // No tool call = final answer
            finalResponse = aiResponse;
            break;
        }

        // There's a tool call — execute it
        // First, show the AI's explanation (text before the tool call block)
        const textBeforeToolCall = aiResponse.split('```tool_call')[0].trim();
        if (textBeforeToolCall) {
            conversationHistory.push({ role: 'assistant', content: textBeforeToolCall });
        }

        // Tool call step
        const toolStep: AgentStep = {
            id: `step-${Date.now()}-tool`,
            type: 'tool_call',
            tool: toolCall.tool,
            input: toolCall.tool === 'terminal' ? toolCall.command : toolCall.path,
            status: 'running',
            timestamp: Date.now(),
        };
        steps.push(toolStep);
        onStep?.(toolStep);

        // Execute the tool
        const result = await executeToolCall(toolCall, rootPath);

        // Tool result step
        toolStep.status = 'done';
        toolStep.output = result.length > 2000 ? result.substring(0, 2000) + '\n... (truncated)' : result;
        onStep?.(toolStep);

        const resultStep: AgentStep = {
            id: `step-${Date.now()}-result`,
            type: 'tool_result',
            tool: toolCall.tool,
            output: toolStep.output,
            status: 'done',
            timestamp: Date.now(),
        };
        steps.push(resultStep);
        onStep?.(resultStep);

        // Feed result back to AI
        conversationHistory.push({
            role: 'assistant',
            content: `I used ${toolCall.tool}: ${toolCall.tool === 'terminal' ? toolCall.command : toolCall.path}`
        });
        conversationHistory.push({
            role: 'user',
            content: `[TOOL RESULT for ${toolCall.tool}]:\n${toolStep.output}\n\nContinue with the task. If the task is complete, provide a final summary without any tool_call blocks.`
        });
    }

    if (iteration >= maxIterations && !finalResponse) {
        finalResponse = `⚠️ Agent reached maximum iterations (${maxIterations}). Here's what was accomplished:\n\n` +
            steps.filter(s => s.type === 'tool_call')
                .map(s => `- **${s.tool}**: \`${s.input}\` → ${s.status}`)
                .join('\n');
    }

    return { finalResponse, steps };
}
