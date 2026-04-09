import type { ChalkInstance } from 'chalk';

export interface Output {
    debug: (msg: string) => void;
    info: (msg: string) => void;
    log: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
}

export type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';

/* -- Colors -- */
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

/* --- Options --- */
export type LoggerOptions<C extends Color> = {
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

    /**
     * Format options to use if no separate options are specified when calling a format function.
     */
    defaultFormatOptions?: Required<FormatOptions>;

    /**
     * Error format options to use if no separate options are specified when calling the error format function with { json: false }.
     */
    defaultErrorStringFormatOptions?: Required<ErrorStringFormatOptions>;

    /**
     * Format options to use if no separate options are specified when calling a format function with { json: true }.
     */
    defaultErrorJsonFormatOptions?: Required<ErrorJSONFormatOptions>;

    colors: Required<ColorMap<C>>;
    applyColor: (text: string, style: C) => string;

    /**
     * Used to format colored properties into a string.<br>
     * Return an array of strings, which will be joined by a space character if the strings aren't empty.<br>
     * Default output format:
     * `level time callerLocation source message`
     */
    formatString?: (message: string, level: string, time: string, source: string, callerLocation: string) => string[];

    /**
     * Function to serialize JSON. Used for objects of type unknown
     * @default {@link JSON.stringify}
     */
    stringify?: typeof JSON.stringify;

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
    color?: boolean;
    indentAmount?: number;
    json?: false | undefined;
}

export interface ErrorJSONFormatOptions extends BaseErrorFormatOptions {
    json: true;
}

export type ErrorFormatOptions = ErrorStringFormatOptions | ErrorJSONFormatOptions;