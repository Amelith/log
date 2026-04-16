import type { Color, ErrorFormatter } from './types.js';

export function getCurrentTime(): string {
    return timeToString(new Date());
}

function timeToString(t: Date): string {
    const year = padZeroes(t.getFullYear(), 2);
    const month = padZeroes(t.getMonth(), 2);
    const day = padZeroes(t.getDate(), 2);
    const hours = padZeroes(t.getHours(), 2);
    const minutes = padZeroes(t.getMinutes(), 2);
    const seconds = padZeroes(t.getSeconds(), 2);
    const millis = padZeroes(t.getMilliseconds(), 3);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
}

function padZeroes(n: number, padAmount: number, radix = 10): string {
    return n.toString(radix).padStart(padAmount, '0');
}

/**
 * Gets the caller function's location, filtering out internal logging functions.
 * @return file:number
 */
export function getCallerLocation(ignoredFunctions: string[]): string {
    const stack = new Error().stack;
    if (!stack) return '';

    const lines = stack.split('\n');

    // 0 is "Error"
    // 1 usually getCallerLocation
    // 2+ are actual calls
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Regex to parse stack lines
        // Matches: "    at FunctionName (/path/to/file.ts:10:5)"
        // OR:      "    at /path/to/file.ts:10:5"
        const match = line?.match(/at\s+(?:(?<func>.+?)\s+\()?(?<path>.+?):(?<line>\d+)(?::\d+)?\)?$/);

        if (!match?.groups) continue;

        const { func, path: filePath, line: lineNumber } = match.groups;

        if (!filePath) continue;

        // found a function name -> check if ignored
        if (func) {
            // clean up function name (sometimes it's "Object.info" or "async info")
            const cleanName = func.split('.').pop()?.replace(/^async\s+/, '').trim();
            // skip if internal
            if (cleanName && ignoredFunctions.includes(cleanName)) continue;
        }

        const fileName = filePath.replace(/^.*[/\\]/, '').trim();
        return `${fileName}:${lineNumber}`;
    }

    return '';
}

// Helper function that infers T from the check property
export function createErrorFormatter<T, C extends Color = Color>(
    formatter: ErrorFormatter<T, C>
): ErrorFormatter<T, C> {
    return formatter;
}