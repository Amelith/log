/* ------ Types ------ */

interface BaseErrorFormatOptions {
    includeStack?: boolean;
    json?: boolean | undefined;
}

interface ErrorStringFormatOptions extends BaseErrorFormatOptions {
    color?: boolean;
    indentAmount?: number;
    json?: false | undefined;
}

interface ErrorJSONFormatOptions extends BaseErrorFormatOptions {
    json: true;
}

export type ErrorFormatOptions = ErrorStringFormatOptions | ErrorJSONFormatOptions;

const defaultErrorFormatOptions: Required<ErrorStringFormatOptions> = {
    color: false,
    includeStack: false,
    indentAmount: 4,
    json: false,
};

interface ErrnoError extends Error {
    address?: string;
    code?: string;
    dest?: string;
    errno?: string | number;
    info?: object;
    path?: string;
    port?: number;
    syscall?: string;
}

interface ChildProcessError extends Error {
    code: number | string | null;
    errno?: string;
    syscall?: string;
    path?: string;
    spawnargs?: string[];
    killed?: boolean;
    signal?: string | null;
    cmd: string;
}

type Json = Record<string, unknown>;

/* ------ Helpers ------ */

export function indentJSON(data: unknown, level = 1, indentAmount = defaultErrorFormatOptions.indentAmount): string {
    return indent(JSON.stringify(data, null, indentAmount), level, indentAmount);
}

/**
 * Indents every line of text.
 * @param text text
 * @param level indent level
 * @param amount amount of spaces to indent with
 */
export function indent(text: string, level = 1, amount = defaultErrorFormatOptions.indentAmount): string {
    const pad = ' '.repeat(amount).repeat(level);
    return text
        .split('\n')
        .map(line => pad + line)
        .join('\n');
}

/**
 * Applies color to a string only if formatting is enabled.
 */
function style(text: string, colorFn: (t: string) => string, options: ErrorStringFormatOptions): string {
    return options.color ? colorFn(text) : text;
}

/**
 * Helper to format a header line (e.g., "Raw Error:")
 */
function formatHeader(key: string, options: ErrorStringFormatOptions): string {
    return style(key, chalk.cyan.bold, options);
}

/**
 * Helper to format a key-value pair (e.g., "Code: 50013")
 */
function formatField(key: string, value: unknown, options: ErrorStringFormatOptions): string {
    const keyStr = style(`${key}:`, chalk.cyan, options);
    return `${keyStr} ${String(value)}`;
}

/* ------ Main functions ------ */

/**
 * Converts an error to a plain JSON object.
 */
export function errorToJSON(err: unknown, options: Omit<ErrorJSONFormatOptions, 'json'> = { includeStack: defaultErrorFormatOptions.includeStack }): Json {
    return errorToString(err, { ...options, json: true });
}

export function errorToString(err: Error | SpawnSyncReturns<unknown> | unknown, options?: ErrorStringFormatOptions): string;
export function errorToString(err: Error | SpawnSyncReturns<unknown> | unknown, options?: ErrorJSONFormatOptions): Json;

export function errorToString(err: Error | SpawnSyncReturns<unknown> | unknown, options: ErrorFormatOptions = defaultErrorFormatOptions): Json | string {
    // Merge provided options with defaults
    const opts = { ...defaultErrorFormatOptions, ...options };
    let result: string | Json;

    // check for SpawnSyncReturns first (thrown by execSync)
    const spawnObj = err as SpawnSyncReturns<unknown>;
    if (spawnObj && typeof spawnObj === 'object' && 'pid' in spawnObj && 'output' in spawnObj && 'status' in spawnObj) {
        result = spawnSyncReturnsToString(spawnObj, opts);
    }

    else if (!(err instanceof Error)) result = unknownToString(err, opts);

    // Child Process, fs, ...
    else if ('cmd' in err && 'code' in err) result = childProcessErrorToString(err as ChildProcessError, opts);
    else if (
        'syscall' in err ||
        'errno' in err ||
        ('code' in err && typeof err.code === 'string' && ('path' in err || 'address' in err || 'dest' in err))
    ) {
        result = errnoErrorToString(err as ErrnoError, opts);
    }

    // none other match -> generic
    else result = genericErrorToString(err, opts);

    if (typeof err === 'object' && err !== null && 'stack' in err && err.stack && options.includeStack) {
        // Remove the first line of stack if it repeats the message
        const errName = 'name' in err ? err.name as string : 'Error';
        const stack = err.stack as string;
        const stackLines = stack.split('\n');
        const cleanStack = stackLines.length > 1 && errName && stackLines[0]?.includes(errName)
            ? stackLines.slice(1).join('\n')
            : stack;

        if (opts.json) {
            // Attach stack to the JSON object
            if (typeof result === 'object' && result !== null) {
                result['stack'] = cleanStack;
            }
        } else {
            // Append stack to the string
            result = (result as string) + `\n` + formatHeader('Stack:', opts) + `\n` +
                style(indent(cleanStack, 1, opts.indentAmount), chalk.gray, opts) + '\n';
        }
    }

    return result;
}

/* ------ Specific formatters ------ */

export function errnoErrorToString(error: ErrnoError, options: ErrorFormatOptions = defaultErrorFormatOptions): string | Json {
    if (options.json) {
        return {
            type: 'SystemError',
            message: error.message,
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            path: error.path,
            dest: error.dest,
            address: error.address,
            port: error.port,
            info: error.info
        };
    }

    const parts: string[] = [];

    parts.push(style(`[SystemError] ${error.message}`, chalk.red.bold, options));

    if (error.code) parts.push(formatField('Code', error.code, options));
    if (error.errno) parts.push(formatField('Errno', error.errno, options));
    if (error.syscall) parts.push(formatField('Syscall', error.syscall, options));

    // Filesystem specific
    if (error.path) parts.push(formatField('Path', error.path, options));
    if (error.dest) parts.push(formatField('Dest', error.dest, options));

    // Network specific
    if (error.address) parts.push(formatField('Address', error.address, options));
    if (error.port) parts.push(formatField('Port', error.port, options));

    if (error.info) {
        parts.push(formatHeader('Info:', options));
        parts.push(indentJSON(error.info, 1, options.indentAmount));
    }

    return parts.join('\n');
}

export function childProcessErrorToString(error: ChildProcessError, options: ErrorFormatOptions = defaultErrorFormatOptions): string | Json {
    if (options.json) {
        return {
            type: 'ChildProcessError',
            message: error.message,
            command: error.cmd,
            exitCode: error.code,
            signal: error.signal,
            killed: error.killed,
            spawnArgs: error.spawnargs
        };
    }

    const parts: string[] = [];

    parts.push(style(`[ChildProcessError] ${error.message}`, chalk.red.bold, options));

    if (error.cmd) parts.push(formatField('Command', error.cmd, options));
    if (error.code !== undefined && error.code !== null) parts.push(formatField('Exit Code', error.code, options));
    if (error.signal) parts.push(formatField('Signal', error.signal, options));
    if (error.killed) parts.push(formatField('Killed', error.killed, options));

    if (error.spawnargs && error.spawnargs.length > 0) {
        parts.push(formatField('Args', error.spawnargs.join(' '), options));
    }

    return parts.join('\n');
}

export function spawnSyncReturnsToString(result: SpawnSyncReturns<unknown>, options: ErrorFormatOptions = defaultErrorFormatOptions): string | Json {
    if (options.json) {
        const obj: Json = {
            type: 'SpawnSyncReturns',
            pid: result.pid,
            status: result.status,
            signal: result.signal,
            stdout: String(result.stdout),
            stderr: String(result.stderr)
        };
        if (result.error) {
            obj['underlyingError'] = errorToString(result.error, options);
        }
        return obj;
    }

    const parts: string[] = [];

    const title = result.error ? 'Process Failed' : 'Process Result';
    parts.push(style(`[SpawnSyncReturns] ${title}`, chalk.yellow.bold, options));

    parts.push(formatField('PID', result.pid, options));
    parts.push(formatField('Status', result.status ?? 'N/A', options));

    if (result.signal) parts.push(formatField('Signal', result.signal, options));

    // If there is an underlying error object (e.g. failure to spawn), format it recursively
    if (result.error) {
        parts.push(formatHeader('Underlying Error:', options));
        parts.push(indent(errorToString(result.error, options), 1, options.indentAmount));
    }

    return parts.join('\n');
}

function genericErrorToString(error: Error, options: ErrorFormatOptions = defaultErrorFormatOptions): string | Json {
    if (options.json) {
        const obj: Json = {
            type: error.name || 'Error',
            message: error.message,
        };
        if (error.cause) {
            // don't attach full cause object to avoid circular references
            obj['cause'] = errorToString(error.cause, options);
        }
        return obj;
    }

    const parts: string[] = [];

    const name = error.name || 'Error';
    parts.push(style(`${name}: ${error.message}`, chalk.red.bold, options));

    // recursively print cause
    if (error.cause) {
        parts.push(formatHeader('Cause:', options));
        parts.push(indent(errorToString(error.cause, options), 1, options.indentAmount));
    }

    return parts.join('\n');
}

function unknownToString(err: unknown, options: ErrorFormatOptions = defaultErrorFormatOptions): string | Json {
    if (options.json) {
        if (typeof err === 'object' && err !== null) {
            return err as Json;
        }
        return { error: err };
    }

    const s = (str: string): string => style(str, chalk.yellow, options);
    if (typeof err === 'string') {
        return s(err);
    } else {
        return s(indentJSON(err, 1, options.indentAmount));
    }
}