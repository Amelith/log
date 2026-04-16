import type { ChalkInstance } from 'chalk';

type NonUndefined<T> = T extends undefined | null ? never : T;

/**
 * Requires all properties in T to be present and defined.
 */
export type StrictRequired<T> = {
    [K in keyof T]-?: NonUndefined<T[K]>;
};

export interface Output {
    debug: (msg: unknown) => void;
    info: (msg: unknown) => void;
    log: (msg: unknown) => void;
    warn: (msg: unknown) => void;
    error: (msg: unknown) => void;
}

export type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';

/* --- Colors --- */

export type HEX = `#${string}`;
/** RGB or RGBA */
export type RGB = [number, number, number] | [number, number, number, number];

/**
 * Advanced styling options for custom formatters (HTML/CSS/SVG etc.)<br>
 * {@link additionalProperties} can be used for CSS classes, etc.
 */
export interface ColorStyle {
    color?: HEX | RGB | string;
    background?: HEX | RGB | string;
    opacity?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;

    additionalProperties?: string | object;
}

export type ManualColor = HEX | RGB | ColorStyle;
export type Color = ManualColor | ChalkInstance;

export interface ColorMap<C extends Color> {
    /** @default chalk.hex('#666') */
    debug?: C | undefined;

    /** @default undefined (unformatted) */
    log?: C | undefined;

    /** @default undefined (unformatted) */
    info?: C | undefined;

    /** @default chalk.hex('#ff4d00') */
    warn?: C | undefined;

    error?: {
        /** @default chalk.red / #A00 */
        style?: C | undefined;

        /**
         * Applied to the error name (TypeError, RangeError, ... or `error.name`) and the message (`error.message`).
         * @default chalk.red.bold / #A00 & bold
         */
        nameStyle?: C | undefined;

        /**
         * Applied to header strings for specific error properties (stack, cause, etc.)
         * @default chalk.cyan.bold / #0AA & bold
         */
        headings?: C | undefined;

        /**
         * Used when formatting key-value pairs
         * @default chalk.cyan / #0AA
         */
        fieldKeys?: C | undefined;

        /**
         * Applied to stack traces
         * @default chalk.gray / #555
         */
        stack?: C | undefined;

        /**
         * Applied to unknown error types (custom objects, ...)
         * @default chalk.yellow / #A50
         */
        unknown?: C | undefined;
    } | undefined;

    /**
     * Applied to the `time` part of the log string.
     * @default chalk.hex('#909090').dim / #909090 with opacity 0.7 (gray)
     */
    time?: C | undefined;
    /**
     * Applied to the `callerLocation` part of the log string.
     * @default chalk.hex('#909090').dim / #909090 with opacity 0.7
     */
    callerLocation?: C | undefined;
    /**
     * Applied to the `source` part of the log string.
     * @default chalk.hex('#3c7ac0') (dark blue)
     */
    source?: C | undefined;
}

/* --- Errors --- */
export interface ErrorFormatter<T, C extends Color = Color> {
    check: ((err: unknown) => err is T) | (new (...args: any[]) => T);
    toString: (err: T, options: StrictRequired<ErrorStringFormatOptions>, helpers: {
        formatErrorName: (name: string, message: string, color?: C) => string,
        formatHeading: (key: string, color?: C) => string,
        formatField: (key: string, value: unknown, keyColor?: C) => string,
        indent: (text: string, level: number, amount: number) => string,
        indentJSON: (data: unknown, level: number, amount: number) => string,
        style: (text: string, color: C | undefined) => string,
        colorMap: Required<ColorMap<C>>,
        /**
         * For recursively formatting nested errors.
         */
        formatError: (err: unknown) => string
    }) => string | string[];
    toJSON: (err: T, options: StrictRequired<ErrorJSONFormatOptions>, helpers: {
        /**
         * For recursively formatting nested errors.
         */
        errorToJSON: (err: unknown) => unknown
    }) => unknown;
}

export interface ErrnoError extends Error {
    address?: string;
    code?: string;
    dest?: string;
    errno?: string | number;
    info?: object;
    path?: string;
    port?: number;
    syscall?: string;
}

export interface ChildProcessError extends Error {
    code: number | string | null;
    errno?: string;
    syscall?: string;
    path?: string;
    spawnargs?: string[];
    killed?: boolean;
    signal?: string | null;
    cmd: string;
}

/* --- Options --- */
export interface LoggerOptions<C extends Color> {
    /**
     * Function to get the current time.<br>
     * Default format:
     * YYYY-MM-DD HH:mm:ss.sss<br>
     * Set to `() => ''` to completely exclude.
     */
    getTime?: () => string;

    /**
     * Names of functions to be ignored when getting the file that the log function was called from.<br>
     * Functions in this package are excluded automatically.<br>
     * @default ['processTicksAndRejections']
     */
    ignoredLogFunctions?: string[];

    colors: Required<ColorMap<C>>;
    applyColor: (text: string, style: C) => string;

    /**
     * Format options to use if no separate options are specified when calling a format function.
     */
    defaultFormatOptions?: StrictRequired<FormatOptions>;

    /**
     * Error format options to use if no separate options are specified when calling the error format function with { json: false }.
     */
    defaultErrorStringFormatOptions?: StrictRequired<Omit<ErrorStringFormatOptions, 'json'>>;

    /**
     * Format options to use if no separate options are specified when calling a format function with { json: true }.
     */
    defaultErrorJsonFormatOptions?: StrictRequired<Omit<ErrorJSONFormatOptions, 'json'>>;

    /**
     * Whether to output errors as raw objects by default.
     */
    outputErrorsAsJson?: boolean | undefined;

    /**
     * Used to format colored properties into a string.<br>
     * Return an array of strings, which will be joined by a space character if the strings aren't empty.<br>
     * Default output format:
     * `level time callerLocation source message`
     */
    formatString?: (message: string, level: string, time: string, source: string, callerLocation: string) => string[];

    /**
     * Additional error formatters.<br>
     * Providing a class for the check property uses instanceof,
     * otherwise use a function returning a boolean to determine error type.<br>
     * The formatter function should return an object if options.json === true, otherwise a string.<br>
     * Functions for styling specific error properties can be used in the custom formatting function.<br>
     * By default, formatters are included for:
     * - {@link SpawnSyncReturns} (thrown by spawnSync)
     * - Unknown errors (string literals, custom objects etc.).
     *   In this case, any properties are attached using JSON.stringify with no formatting.
     * - Child process errors
     * - System errors (errno) (fs, network, etc.)
     * - Generic {@link Error}s
     *
     * Order in which formatters are added matters, especially for subclasses.
     * If `foo` extends `bar`, add the formatter for `foo` first as `err instanceof bar`
     * is true for both objects of type `foo` and objects of type `bar`.<br>
     *
     * All error types included by default are checked after this array, in the order mentioned above.<br>
     * Stack is added separately after the formatter is called, if specified.<br>
     *
     * Use {@link createErrorFormatter} for type-safe function creation.
     */
    additionalErrorFormatters?: ErrorFormatter<any, C>[];

    /**
     * Function to replace JSON values. Used for error objects of type unknown.<br>
     * This is directly passed to JSON.stringify.<br>
     * @default null
     */
    jsonReplacer?: Parameters<JSON['stringify']>[1];

    /**
     * Object containing functions for debug, info, log, warn and error.
     * @default {@link console}
     */
    output?: Output;
}

export interface FormatOptions {
    applyColor?: boolean | undefined;
    includeLevel?: boolean | undefined;
    includeTime?: boolean | undefined;
    includeCallerLocation?: boolean | undefined;
}

interface BaseErrorFormatOptions {
    includeStack?: boolean;
    json?: boolean | undefined;
}

export interface ErrorStringFormatOptions extends BaseErrorFormatOptions {
    applyColor?: boolean | undefined;
    indentAmount?: number | undefined;
    json?: false | undefined;
}

export interface ErrorJSONFormatOptions extends BaseErrorFormatOptions {
    json: true;
}

export type ErrorFormatOptions = ErrorStringFormatOptions | ErrorJSONFormatOptions;