import type { SpawnSyncReturns } from 'node:child_process';
import type {
    ChildProcessError,
    Color,
    ColorMap,
    ErrnoError,
    ErrorFormatOptions,
    ErrorFormatter,
    ErrorJSONFormatOptions,
    ErrorStringFormatOptions,
    FormatOptions,
    LoggerOptions,
    LogLevel,
    Output, StrictRequired
} from './types.js';
import { getCallerLocation, getCurrentTime } from './util.js';

export class LogFormatter<C extends Color> {
    private readonly getTime: () => string;
    private readonly ignoredLogFunctions: string[];
    private readonly colorMap: Required<ColorMap<C>>;
    private readonly applyColor: (text: string, style: C) => string;
    private readonly defaultFormatOptions: StrictRequired<FormatOptions>;
    private readonly defaultErrorStringFormatOptions: StrictRequired<Omit<ErrorStringFormatOptions, 'json'>>;
    private readonly defaultErrorJsonFormatOptions: StrictRequired<Omit<ErrorJSONFormatOptions, 'json'>>;
    private readonly outputErrorsAsJson;
    private readonly formatString: (message: string, level: string, time: string, source: string, callerLocation: string) => string[];
    private readonly additionalErrorFormatters: ErrorFormatter<unknown, C>[];
    private readonly jsonReplacer: Parameters<JSON['stringify']>[1];
    private readonly output: Output;

    constructor(options: LoggerOptions<C>) {
        this.getTime = options?.getTime ?? getCurrentTime;
        this.ignoredLogFunctions = options?.ignoredLogFunctions ?? ['processTicksAndRejections'];
        this.ignoredLogFunctions.push('debug', 'log', 'info', 'warn', 'error', 'format', 'formatString', 'getCallerLocation');
        this.colorMap = options.colors;
        this.applyColor = options.applyColor;
        this.defaultFormatOptions = options?.defaultFormatOptions ?? {
            applyColor: true,
            includeLevel: true,
            includeTime: true,
            includeCallerLocation: true,
        };
        this.defaultErrorStringFormatOptions = options?.defaultErrorStringFormatOptions ?? {
            applyColor: true,
            includeStack: true,
            indentAmount: 4,
        };
        this.defaultErrorJsonFormatOptions = options?.defaultErrorJsonFormatOptions ?? {
            includeStack: this.defaultErrorStringFormatOptions.includeStack,
        };
        this.outputErrorsAsJson = options?.outputErrorsAsJson ?? false;
        this.formatString = options?.formatString ?? ((m, l, t, s, c) => [l, t, c, s, m]);
        this.additionalErrorFormatters = options?.additionalErrorFormatters ?? [];
        this.jsonReplacer = options?.jsonReplacer ?? null;
        this.output = options?.output ?? console;
    }

    private _parseFormatOptions(options?: FormatOptions): StrictRequired<FormatOptions> {
        return {
            applyColor: options?.applyColor ?? this.defaultFormatOptions.applyColor,
            includeLevel: options?.includeLevel ?? this.defaultFormatOptions.includeLevel,
            includeTime: options?.includeTime ?? this.defaultFormatOptions.includeTime,
            includeCallerLocation: options?.includeCallerLocation ?? this.defaultFormatOptions.includeCallerLocation,
        };
    }


    private _parseErrorFormatOptions(
        options?: ErrorFormatOptions
    ): StrictRequired<
        Omit<ErrorStringFormatOptions, 'json'> &
        Omit<ErrorJSONFormatOptions, 'json'> &
        { json: boolean }
    > {
        const providedIndentAmount = options && 'indentAmount' in options ? options.indentAmount : undefined;
        const providedApplyColor = options && 'applyColor' in options ? options.applyColor : undefined;
        return {
            applyColor: providedApplyColor ?? this.defaultErrorStringFormatOptions.applyColor,
            indentAmount: providedIndentAmount ?? this.defaultErrorStringFormatOptions.indentAmount,
            includeStack: options?.includeStack ?? this.defaultErrorStringFormatOptions.includeStack,
            json: this.outputErrorsAsJson,
        };
    }

    private _style(text: string, color: C | undefined, options?: { applyColor?: boolean | undefined }): string {
        const applyColor = options?.applyColor ?? this.defaultFormatOptions.applyColor;
        if (!text) return '';
        return applyColor && color ? this.applyColor(text, color) : text;
    }

    private _getLogLevelColor(level: LogLevel): C | undefined {
        switch (level) {
            case 'debug': return this.colorMap.debug;
            case 'info': return this.colorMap.debug;
            case 'log': return this.colorMap.debug;
            case 'warn': return this.colorMap.warn;
            case 'error': return this.colorMap.error?.style;
        }
    }

    public format(message: string, level: LogLevel, source?: string, options?: FormatOptions): string {
        const opts = this._parseFormatOptions(options);
        const lvl = opts.includeLevel ? this._style(`[${level}]`, this._getLogLevelColor(level), opts) : '';
        const t = opts.includeTime ? this._style(this.getTime(), this.colorMap.time, opts) : '';
        const callerLocation = opts.includeCallerLocation ? getCallerLocation(this.ignoredLogFunctions) : '';
        const cl = callerLocation ? this._style(`[${callerLocation}]`, this.colorMap.callerLocation, opts) : '';
        const src = source ? this._style(`[${source}]`, this.colorMap.source, opts) : '';

        return this.formatString(message, lvl, t, src, cl).filter(Boolean).join(' ');
    }

    public debug(message: string, source?: string, options?: FormatOptions) {
        const msg = this._style(message, this.colorMap.debug, options);
        const m = this.format(msg, 'debug', source, options);
        this.output.debug(m);
    }

    public info(message: string, source?: string, options?: FormatOptions) {
        const msg = this._style(message, this.colorMap.info, options);
        const m = this.format(msg, 'info', source, options);
        this.output.info(m);
    }

    public log(message: string, source?: string, options?: FormatOptions) {
        const msg = this._style(message, this.colorMap.log, options);
        const m = this.format(msg, 'log', source, options);
        this.output.log(m);
    }

    public warn(message: string, source?: string, options?: FormatOptions) {
        const msg = this._style(message, this.colorMap.warn, options);
        const m = this.format(msg, 'warn', source, options);
        this.output.warn(m);
    }

    public error(message: string, err?: unknown, source?: string, options?: FormatOptions & ErrorFormatOptions) {
        const msg = this._style(message, this.colorMap.error?.style, options);
        const m = this.format(msg, 'error', source, options);
        const lines: unknown[] = [m];

        if (err) {
            const opts = this._parseErrorFormatOptions(options);
            const f = this.formatError(err, opts);
            lines.push(typeof f === 'string' ? this._indent(f, 1, opts.indentAmount) : f);
        }

        this.output.error(lines.join('\n'));
    }

    /* ----- Error formatting ----- */

    public formatError(err: unknown, options?: ErrorFormatOptions): string | unknown;
    public formatError(err: unknown, options?: ErrorStringFormatOptions): string;
    public formatError(err: unknown, options?: ErrorJSONFormatOptions): unknown;

    public formatError(err: unknown, options?: ErrorStringFormatOptions | ErrorJSONFormatOptions): string | unknown {
        const opts = this._parseErrorFormatOptions(options);
        const result = this._formatErrorWithoutStack(err, opts);

        if (opts.includeStack && typeof err === 'object' && err !== null && 'stack' in err && err.stack) {
            // Remove the first line of stack if it repeats the message
            const errName = 'name' in err ? err.name as string : 'Error';
            const stack = err.stack as string;
            const stackLines = stack.split('\n');
            const cleanStack = stackLines.length > 1 && errName && stackLines[0]?.includes(errName)
                ? stackLines.slice(1).map(l => l.trim()).join('\n')
                : stack;

            if (opts.json) {
                if (typeof result === 'object' && result !== null) {
                    // @ts-ignore assign is fine
                    result['stack'] = cleanStack;
                }
            } else {
                // Append stack to the string
                const r = [
                    result,
                    this._formatHeading('Stack', opts),
                    this._style(this._indent(cleanStack, 1, opts.indentAmount), this.colorMap.error?.stack, opts),
                ];

                return r.join('\n');
            }
        }

        return result;
    }

    /**
     * Converts an error to a plain JSON object.
     */
    public errorToJSON(err: unknown, options: Omit<ErrorJSONFormatOptions, 'json'> = this.defaultErrorJsonFormatOptions): unknown {
        return this.formatError(err, { ...options, json: true });
    }

    /* --- Error format helpers --- */

    /**
     * Indents every line of text.
     * @param text text
     * @param level indent level
     * @param amount amount of spaces to indent with
     */
    private _indent(text: string, level = 1, amount = this.defaultErrorStringFormatOptions.indentAmount): string {
        const pad = ' '.repeat(amount).repeat(level);
        return text
            .split('\n')
            .map(line => pad + line)
            .join('\n');
    }

    private _indentJSON(data: unknown, level = 1, indentAmount = this.defaultErrorStringFormatOptions.indentAmount): string {
        return this._indent(JSON.stringify(data, this.jsonReplacer, indentAmount), level, indentAmount);
    }

    private _formatErrorName(name: string, message: string, options?: { applyColor?: boolean | undefined }, color?: C): string {
        return this._style(`[${name}] ${message}`, color ?? this.colorMap.error?.nameStyle, options);
    }

    /**
     * Helper to format a header line (e.g., "Raw Error:")
     */
    private _formatHeading(key: string, options?: { applyColor?: boolean | undefined }, color?: C): string {
        return this._style(`${key}:`, color ?? this.colorMap.error?.headings, options);
    }

    /**
     * Helper to format a key-value pair (e.g., "Code: 50013")
     */
    private _formatField(key: string, value: unknown, options: { applyColor?: boolean | undefined }, color?: C): string {
        const keyStr = this._style(`${key}:`, color ?? this.colorMap.error?.fieldKeys, options);
        return `${keyStr} ${String(value)}`;
    }
    
    /* --- Error format functions --- */

    private _formatErrorWithoutStack(err: unknown, opts: StrictRequired<ErrorFormatOptions>): string | unknown {
        // check additional error types
        for (const { check, toString, toJSON } of this.additionalErrorFormatters) {
            const matches = check.prototype !== undefined && check.prototype.constructor === check
                ? err instanceof check
                : (check as ((err: unknown) => boolean))(err);

            if (matches) {
                if (opts.json) return toJSON(err, opts, {
                    errorToJSON: (e) => this.errorToJSON(e, opts),
                });
                else {
                    const s = toString(err, opts, {
                        formatErrorName: (name, message, color) => this._formatErrorName(name, message, opts, color),
                        formatHeading: (key, color) => this._formatHeading(key, opts, color),
                        formatField: (key, value, keyColor) => this._formatField(key, value, opts, keyColor),
                        indent: (text, level, amount) => this._indent(text, level, amount),
                        indentJSON: (data, level, amount) => this._indentJSON(data, level, amount),
                        style: (text: string, color: C | undefined) => this._style(text, color, opts),
                        colorMap: this.colorMap,
                        formatError: (e) => this.formatError(e, opts) as string,
                    });

                    return Array.isArray(s) ? s.join('\n') : s;
                }
            }
        }

        if (typeof err === 'object' && err) {
            // check for SpawnSyncReturns first (thrown by execSync)
            const spawnObj = err as SpawnSyncReturns<unknown>;
            if ('pid' in spawnObj && 'output' in spawnObj && 'status' in spawnObj) {
                return this.spawnSyncReturnsToString(spawnObj, opts);
            }

            // Child Process, fs, ...
            else if ('cmd' in err && 'code' in err) return this.childProcessErrorToString(err as ChildProcessError, opts);

            else if (
                'syscall' in err ||
                'errno' in err ||
                ('code' in err && typeof err.code === 'string' && ('path' in err || 'address' in err || 'dest' in err))
            ) {
                return this.errnoErrorToString(err as ErrnoError, opts);
            }

            else if (err instanceof Error) return this.genericErrorToString(err, opts);
        }

        return this.unknownToString(err, opts);
    }

    public errnoErrorToString(error: ErrnoError, options: ErrorFormatOptions = this.defaultErrorStringFormatOptions): string | unknown {
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

        parts.push(this._formatErrorName('SystemError', error.message, options));

        if (error.code) parts.push(this._formatField('Code', error.code, options));
        if (error.errno) parts.push(this._formatField('Errno', error.errno, options));
        if (error.syscall) parts.push(this._formatField('Syscall', error.syscall, options));

        // Filesystem specific
        if (error.path) parts.push(this._formatField('Path', error.path, options));
        if (error.dest) parts.push(this._formatField('Dest', error.dest, options));

        // Network specific
        if (error.address) parts.push(this._formatField('Address', error.address, options));
        if (error.port) parts.push(this._formatField('Port', error.port, options));

        if (error.info) {
            parts.push(this._formatHeading('Info', options));
            parts.push(this._indentJSON(error.info, 1, options.indentAmount));
        }

        return parts.join('\n');
    }

    public childProcessErrorToString(error: ChildProcessError, options: ErrorFormatOptions = this.defaultErrorStringFormatOptions): string | unknown {
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

        parts.push(this._formatErrorName('ChildProcessError', error.message, options));

        if (error.cmd) parts.push(this._formatField('Command', error.cmd, options));
        if (error.code !== undefined && error.code !== null) parts.push(this._formatField('Exit Code', error.code, options));
        if (error.signal) parts.push(this._formatField('Signal', error.signal, options));
        if (error.killed) parts.push(this._formatField('Killed', error.killed, options));

        if (error.spawnargs && error.spawnargs.length > 0) {
            parts.push(this._formatField('Args', error.spawnargs.join(' '), options));
        }

        return parts.join('\n');
    }

    public spawnSyncReturnsToString(result: SpawnSyncReturns<any>, options: ErrorFormatOptions = this.defaultErrorStringFormatOptions): string | unknown {
        if (options.json) {
            const obj: Record<string, unknown> = {
                type: 'SpawnSyncReturns',
                pid: result.pid,
                status: result.status,
                signal: result.signal,
                stdout: result.stdout.toString(),
                stderr: result.stderr.toString(),
            };
            if (result.error) {
                obj['underlyingError'] = this.formatError(result.error, options);
            }
            return obj;
        }

        const parts: string[] = [];

        const title = result.error || result.status !== 0 ? 'Process Failed' : 'Process Result';
        parts.push(this._formatErrorName('SpawnSyncReturns', title, options));

        parts.push(this._formatField('PID', result.pid, options));
        parts.push(this._formatField('Status', result.status ?? 'N/A', options));

        if (result.signal) parts.push(this._formatField('Signal', result.signal, options));

        // If there is an underlying error object (e.g. failure to spawn), format it recursively
        if (result.error) {
            parts.push(this._formatHeading('Underlying Error', options));
            parts.push(this._indent(this.formatError(result.error, options) as string, 1, options.indentAmount));
        }

        return parts.join('\n');
    }

    public genericErrorToString(error: Error, options: ErrorFormatOptions = this.defaultErrorStringFormatOptions): string | unknown {
        if (options.json) {
            const obj: Record<string, unknown> = {
                type: error.name || 'Error',
                message: error.message,
            };
            if (error.cause) {
                // don't attach full cause object to avoid circular references
                obj['cause'] = this.formatError(error.cause, options);
            }
            return obj;
        }

        const parts: string[] = [];

        const name = error.name || 'Error';
        parts.push(this._formatErrorName(name, error.message, options));

        // recursively print cause
        if (error.cause) {
            parts.push(this._formatHeading('Cause', options));
            parts.push(this._indent(this.formatError(error.cause, options) as string, 1, options.indentAmount));
        }

        return parts.join('\n');
    }

    public unknownToString(err: unknown, options: ErrorFormatOptions = this.defaultErrorStringFormatOptions): string | unknown {
        if (options.json) {
            if (typeof err === 'object' && err !== null) return err;
            return { error: err };
        }

        const s = (str: string): string => this._style(str, this.colorMap.error?.unknown, options);
        if (typeof err === 'string') return s(err);
        return s(this._indentJSON(err, 1, options.indentAmount));
    }
}

export * from './types.js';
export { createErrorFormatter } from './util.js';