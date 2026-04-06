import { type ChalkInstance } from 'chalk';

/* ------ Types ------ */

export type HEX = `#${string}`;
/** RGB or RGBA */
export type RGB = [number, number, number] | [number, number, number, number];

/**
 * Advanced styling options for custom formatters (HTML/CSS/SVG etc.)<br>
 * {@link additionalProperties} can be used for css classes, etc.
 */
export interface ColorStyle {
    color?: HEX | RGB | string;
    background?: HEX | RGB | string;
    fontWeight?: number | 'bold' | 'normal';
    opacity?: number;
    italic?: boolean;
    underline?: boolean;
    dim?: boolean;

    additionalProperties?: string | object;
}

export interface ColorMap<C> {
    /** @default undefined */
    log?: C;

    /** @default undefined */
    info?: C;

    /** @default chalk.hex('#ff4d00') */
    warn?: C;

    error?: {
        /** @default chalk.red */
        style?: C;

        /**
         * Applied to header strings for specific error properties (stack, cause, etc.)
         * @default chalk.cyan.bold
         */
        headers?: C;

        /**
         * Used when formatting key-value pairs
         * @default chalk.cyan
         */
        fieldKeys?: C;

        /**
         * Applied to stack traces
         * @default chalk.gray
         */
        stack?: C;

        /**
         * Applied to unknown error types (custom objects, ...)
         * @default chalk.yellow
         */
        unknown?: C;
    };

    /**
     * Applied to the `time` part of the log string.
     * @default
     */
    time?: C;
    callerLocation?: C;
    source?: C;
}

type LoggerColorOptions<C = HEX | RGB | ColorStyle> =
    | {
        /**
         * Use Chalk instances directly
         */
        colors?: ColorMap<ChalkInstance>;
        applyColor?: never;
    }
    | {
        /**
         * Use custom color data (HEX, RGB, or Style Objects)
         */
        colors?: ColorMap<C>;

        /**
         * Function to apply a color to the given text.
         * @param text Text to be formatted
         * @param style Color / style to be applied
         * @returns A formatted string
         *
         * @example
         * ```ts
         * applyColor: (text, style) => `<span style="color: ${style}">${text}</span>`
         * ```
         */
        applyColor: (text: string, style: C) => string;
    };

export type LoggerOptions<C = HEX | RGB | ColorStyle> = LoggerColorOptions<C> & {
    /** Whether to include the file that the log function was called from.
     * @default true
     */
    includeCallerLocation?: boolean;

    /**
     * Used to format properties into a string.<br>
     * Default output format:
     * `time [callerLocation] [source] message`
     */
    formatString?: (message: string, time?: string, source?: string, callerLocation?: string) => string;

    /**
     * Names of functions to be ignored when getting the caller location.<br>
     * Functions in this package are excluded automatically.<br>
     * @default ['processTicksAndRejections']
     */
    ignoredLogFunctions?: string[];

    /**
     * Function to serialize JSON. Used for objects of type unknown
     * @default {@link JSON.stringify}
     */
    stringify?: typeof JSON.stringify;
}

export class Logger<C> {
    private colorMap: ColorMap<C>;
    private applyColor: (text: string, style: C) => string;

    private includeCallerLocation: boolean;
    private formatString: LoggerOptions['formatString'];
    private ignoredLogFunctions: string[];
    private stringify: typeof JSON.stringify;

    constructor(options?: LoggerOptions<C>) {
        this.colorMap = options?.colors || {

        };
    }
}