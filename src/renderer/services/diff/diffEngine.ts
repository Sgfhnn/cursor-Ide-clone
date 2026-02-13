import * as Diff from 'diff';
import { DiffChange } from '../../types';

class DiffEngine {
    /**
     * Generate a unified diff between two strings
     */
    generateDiff(original: string, modified: string): DiffChange[] {
        const changes = Diff.diffLines(original, modified);
        const result: DiffChange[] = [];
        let lineNumber = 1;

        changes.forEach((change) => {
            const lines = change.value.split('\n').filter((line, idx, arr) => {
                // Keep all lines except the last empty one from the split
                return idx < arr.length - 1 || line !== '';
            });

            lines.forEach((line) => {
                if (change.added) {
                    result.push({
                        type: 'added',
                        value: line,
                        lineNumber: lineNumber++,
                    });
                } else if (change.removed) {
                    result.push({
                        type: 'removed',
                        value: line,
                    });
                } else {
                    result.push({
                        type: 'unchanged',
                        value: line,
                        lineNumber: lineNumber++,
                    });
                }
            });
        });

        return result;
    }

    /**
     * Create a patch string
     */
    createPatch(filename: string, original: string, modified: string): string {
        return Diff.createPatch(filename, original, modified);
    }

    /**
     * Apply a code change by replacing old content with new
     */
    applyChange(original: string, oldCode: string, newCode: string): string {
        return original.replace(oldCode, newCode);
    }
}

export const diffEngine = new DiffEngine();
export default diffEngine;
